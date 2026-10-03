// nqRepositoryPicker: pick a GitHub repository and a branch through the app installation. The markup is the React RepositoryPicker's,
// rendered by <x-nq::repository-picker>. It calls no API itself; the page answers events, or points it at JSON endpoints.
//
//   <div data-slot="repository-picker" x-data="nqRepositoryPicker({ repo: null, branch: null, searchUrl: '/api/repos?q={query}', branchesUrl: '/api/repos/{id}/branches' })">
//
// Events (bubbling, each with { wait(promise) }; hand wait() a promise resolving the array):
//   nq-repo-search    { query }  -> PickerRepo[]  { id, fullName, description?, private?, language?, defaultBranch?, stars?, updatedAt? }
//   nq-repo-branches  { repo }   -> PickerBranch[] { name, default?, protected? }
//   nq-repo-change    { repo, branch }   fired when the person picks a repository or a branch (and when the default branch is chosen for them)
//   nq-repo-configure  fired by "Configure access"
// With no listener, searchUrl / branchesUrl are fetched as JSON; {query}, {id} and {fullName} in the URL are filled in (URL-encoded).
// The search runs when the list opens and as you type (250 ms after the last key); a stale answer is dropped.
// The pure helpers (splitFullName, filterBranches, sortBranches, pickDefaultBranch, moveIndex) are copied from
// packages/web/src/components/repository-picker/repository-picker-format.ts.

import type { Magics, Register } from "./types";

interface Repo {
  id: string;
  fullName: string;
  description?: string;
  private?: boolean;
  language?: string;
  defaultBranch?: string;
  stars?: number;
  updatedAt?: Date | number | string;
}
interface Branch {
  name: string;
  default?: boolean;
  protected?: boolean;
}
type Status = "loading" | "ready" | "error";
type Which = "repo" | "branch";

interface Config {
  repo?: Repo | null;
  branch?: string | null;
  hideBranch?: boolean;
  disabled?: boolean;
  locale?: string;
  searchUrl?: string;
  branchesUrl?: string;
  strings?: Record<string, string>;
}

interface PickerState extends Magics {
  repo: Repo | null;
  branch: string | null;
  hideBranch: boolean;
  disabled: boolean;
  locale: string;
  searchUrl: string;
  branchesUrl: string;
  strings: Record<string, string>;
  repoOpen: boolean;
  branchOpen: boolean;
  query: string;
  branchQuery: string;
  repos: Repo[];
  branches: Branch[];
  repoStatus: Status;
  branchStatus: Status;
  repoActive: number;
  branchActive: number;
  repoRun: number;
  branchRun: number;
  timer: ReturnType<typeof setTimeout> | null;
  readonly owner: string;
  readonly repoName: string;
  readonly shownBranches: Branch[];
  num(n: number): string;
  relative(value: Repo["updatedAt"]): string;
  statusText(which: Which): string;
  searchRepos(delay: number): void;
  loadBranches(): void;
  pickRepo(r: Repo): void;
  pickBranch(b: Branch): void;
  onKey(which: Which, e: KeyboardEvent): void;
  emitChange(): void;
  configure(): void;
}

/** `owner/name` into its parts. A name with no slash has no owner. */
function splitFullName(fullName: string): { owner: string; name: string } {
  const i = fullName.indexOf("/");
  return i < 0 ? { owner: "", name: fullName } : { owner: fullName.slice(0, i), name: fullName.slice(i + 1) };
}
function filterBranches(branches: Branch[], query: string): Branch[] {
  const q = query.trim().toLowerCase();
  return q ? branches.filter((b) => b.name.toLowerCase().includes(q)) : branches;
}
function sortBranches(branches: Branch[]): Branch[] {
  const rank = (b: Branch) => (b.default ? 0 : b.protected ? 1 : 2);
  return [...branches].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
function pickDefaultBranch(branches: Branch[], fallback?: string): string | null {
  const names = new Set(branches.map((b) => b.name));
  const marked = branches.find((b) => b.default);
  if (marked) return marked.name;
  for (const n of [fallback, "main", "master"]) if (n && names.has(n)) return n;
  return branches[0]?.name ?? fallback ?? null;
}
function moveIndex(current: number, delta: 1 | -1, count: number): number {
  if (count <= 0) return -1;
  if (current < 0) return delta === 1 ? 0 : count - 1;
  return (current + delta + count) % count;
}

/** Ask the page (event) or the endpoint (fetch) for a list. */
async function ask<T>(el: HTMLElement, name: string, detail: Record<string, unknown>, url: string): Promise<T[]> {
  const waits: Promise<unknown>[] = [];
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<unknown>) => void waits.push(p) } }));
  if (waits.length) return (await waits[0]) as T[];
  if (!url) return [];
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  return (Array.isArray(json) ? json : (json.data ?? [])) as T[];
}

export const repositoryPicker: Register = (Alpine) => {
  Alpine.data("nqRepositoryPicker", (cfg: Config = {}) => ({
    repo: cfg.repo ?? null,
    branch: cfg.branch ?? null,
    hideBranch: !!cfg.hideBranch,
    disabled: !!cfg.disabled,
    locale: cfg.locale ?? "en",
    searchUrl: cfg.searchUrl ?? "",
    branchesUrl: cfg.branchesUrl ?? "",
    strings: cfg.strings ?? {},
    repoOpen: false,
    branchOpen: false,
    query: "",
    branchQuery: "",
    repos: [] as Repo[],
    branches: [] as Branch[],
    repoStatus: "loading" as Status,
    branchStatus: "loading" as Status,
    repoActive: -1,
    branchActive: -1,
    repoRun: 0,
    branchRun: 0,
    timer: null as ReturnType<typeof setTimeout> | null,
    get owner() {
      const self = this as unknown as PickerState;
      return self.repo ? splitFullName(self.repo.fullName).owner : "";
    },
    get repoName() {
      const self = this as unknown as PickerState;
      return self.repo ? splitFullName(self.repo.fullName).name : "";
    },
    get shownBranches() {
      const self = this as unknown as PickerState;
      return filterBranches(self.branches, self.branchQuery);
    },
    init(this: PickerState) {
      this.$watch("repoOpen", (open: boolean) => {
        this.query = "";
        this.repoActive = -1;
        if (open) this.searchRepos(0);
        else this.repoRun++;
      });
      this.$watch("query", (q: string) => {
        if (!this.repoOpen) return;
        this.repoActive = this.repos.length && q ? 0 : -1;
        this.searchRepos(q ? 250 : 0);
      });
      this.$watch("branchOpen", (open: boolean) => {
        if (!open) this.branchQuery = "";
        this.branchActive = -1;
      });
      this.$watch("branchQuery", (q: string) => (this.branchActive = this.shownBranches.length && q ? 0 : -1));
      if (this.repo && !this.hideBranch) this.loadBranches();
    },
    destroy(this: PickerState) {
      if (this.timer) clearTimeout(this.timer);
      this.repoRun++;
      this.branchRun++;
    },
    num(this: PickerState, n: number) {
      return new Intl.NumberFormat(`${this.locale}-u-nu-latn`).format(n);
    },
    relative(this: PickerState, value: Repo["updatedAt"]) {
      if (value == null) return "";
      const seconds = (new Date(value).getTime() - Date.now()) / 1000;
      const steps: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
      const rtf = new Intl.RelativeTimeFormat(`${this.locale}-u-nu-latn`, { numeric: "auto" });
      for (const [unit, size] of steps) if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
      return rtf.format(Math.round(seconds), "second");
    },
    statusText(this: PickerState, which: Which) {
      const status = which === "repo" ? this.repoStatus : this.branchStatus;
      const count = which === "repo" ? this.repos.length : this.shownBranches.length;
      return status === "loading" ? this.strings.loading : status === "ready" ? (this.strings.results ?? "").replace("{n}", this.num(count)) : this.strings.failed;
    },
    searchRepos(this: PickerState, delay: number) {
      if (this.timer) clearTimeout(this.timer);
      const run = ++this.repoRun;
      this.repoStatus = "loading";
      this.timer = setTimeout(async () => {
        const url = this.searchUrl.replace("{query}", encodeURIComponent(this.query));
        try {
          const list = await ask<Repo>(this.$root as HTMLElement, "nq-repo-search", { query: this.query }, this.searchUrl ? url : "");
          if (run !== this.repoRun) return;
          this.repos = list;
          this.repoStatus = "ready";
          this.repoActive = list.length && this.query ? 0 : -1;
        } catch {
          if (run === this.repoRun) this.repoStatus = "error";
        }
      }, delay);
    },
    loadBranches(this: PickerState) {
      const repo = this.repo;
      const run = ++this.branchRun;
      if (!repo || this.hideBranch) {
        this.branches = [];
        return;
      }
      this.branchStatus = "loading";
      const url = this.branchesUrl.replace("{id}", encodeURIComponent(repo.id)).replace("{fullName}", repo.fullName.split("/").map(encodeURIComponent).join("/"));
      ask<Branch>(this.$root as HTMLElement, "nq-repo-branches", { repo }, this.branchesUrl ? url : "").then(
        (list) => {
          if (run !== this.branchRun) return;
          this.branches = sortBranches(list);
          this.branchStatus = "ready";
          if (!this.branch) {
            this.branch = pickDefaultBranch(list, repo.defaultBranch);
            this.emitChange();
          }
        },
        () => {
          if (run === this.branchRun) this.branchStatus = "error";
        },
      );
    },
    pickRepo(this: PickerState, r: Repo) {
      this.repoOpen = false;
      if (r.id === this.repo?.id) return;
      this.repo = r;
      this.branch = null;
      this.branches = [];
      this.emitChange();
      this.loadBranches();
    },
    pickBranch(this: PickerState, b: Branch) {
      this.branchOpen = false;
      if (!this.repo) return;
      this.branch = b.name;
      this.emitChange();
    },
    emitChange(this: PickerState) {
      // Dispatched from the root: the lists are teleported, so $dispatch from inside them would bubble through <body>, not the picker.
      (this.$root as HTMLElement).dispatchEvent(new CustomEvent("nq-repo-change", { bubbles: true, detail: { repo: this.repo, branch: this.branch } }));
    },
    configure(this: PickerState) {
      this.repoOpen = false;
      (this.$root as HTMLElement).dispatchEvent(new CustomEvent("nq-repo-configure", { bubbles: true }));
    },
    /** Arrows and Enter drive the list while focus stays in the search box. */
    onKey(this: PickerState, which: Which, e: KeyboardEvent) {
      const items = which === "repo" ? this.repos : this.shownBranches;
      const key = which === "repo" ? "repoActive" : "branchActive";
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        this[key] = moveIndex(this[key], e.key === "ArrowDown" ? 1 : -1, items.length);
        this.$nextTick(() => document.getElementById(this.$id("nq-repo", `${which}-${this[key]}`))?.scrollIntoView?.({ block: "nearest" }));
      } else if (e.key === "Enter" && this[key] >= 0) {
        e.preventDefault();
        const item = items[this[key]];
        if (item) which === "repo" ? this.pickRepo(item as Repo) : this.pickBranch(item as Branch);
      }
    },
  }));
};
