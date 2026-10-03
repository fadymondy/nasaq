// nqProjectView: the behaviour of the React ProjectView. The page is rendered by the server; this adds the tab, the board
// drop, the in-cell list edits, the files, the filterable feed and memory, the settings forms and the danger zone, and tells the host through events.
//
//   <section data-slot="project-view" x-data="nqProjectView({ tab, issues, memory, integrations, project, labels, … })"> … </section>
//
// Every change fires an event on the root with detail `{ …, wait(promise) }`. Resolve the promise to confirm, or resolve `{ error }` to
// show the message and put the change back (a rejection shows a generic one). Without a listener the change fails with that message.
//   nq-project-update-issue { id, patch: { title | statusId | priority | assigneeId | dueDate | estimateHours }, wait }
//   nq-project-move-issue   { id, statusId, index, wait }
//   nq-project-create-issue { input: { title, type, priority }, wait }
//   nq-project-delete-issue { id, wait }          nq-project-open-issue { id }
//   nq-project-save         { patch: { name, client, status, startDate, dueDate, budget }, wait }
//   nq-project-upload       { files, wait }       nq-project-download-file { id }       nq-project-delete-file { id, wait }
//   nq-project-memory-save  { input: { kind, text, tags, source }, id?, wait }          nq-project-memory-forget { id, wait }
//   nq-project-integration  { id, connected, wait }                                     nq-project-archive { wait }    nq-project-delete { wait }
//   nq-project-tab          { tab }
// The vault, env list, members, time tracker, composer, GitHub feed and status manager inside keep their own events, so the root listens only to nq-project-* names.

import { projectFeedMatches, projectFill, projectListPatch, projectMemoryMatches, projectParseBudget, projectParseTags } from "./project-view-logic";
import type { AlpineLike, Magics, Register } from "./types";

type Outcome = void | { error?: string } | undefined;

interface Labels {
  failed?: string;
  title?: string;
  name?: string;
  memoryText?: string;
  feedCount?: string;
  memoryCount?: string;
  connect?: string;
  disconnect?: string;
}

interface MemoryItem {
  id: string;
  kind: string;
  text: string;
  tags: string[];
  source: string;
}

interface Config {
  tab: string;
  locale?: string;
  projectKey: string;
  archived?: boolean;
  project: { name: string; client: string; status: string; startDate: string; dueDate: string; budget: string };
  issues: { id: string; key: string }[];
  memory: MemoryItem[];
  integrations: { id: string; name: string; connected: boolean }[];
  feedTotal: number;
  labels?: Labels;
}

interface BoardData {
  cards: { id: string }[];
}

interface State extends Magics {
  root: HTMLElement;
  config: Config;
  tab: string;
  moveError: string;
  listError: string;
  boardSnap: string;
  newOpen: boolean;
  newTitle: string;
  newType: string;
  newPriority: string;
  newError: string;
  newBusy: boolean;
  filesError: string;
  uploading: boolean;
  feedKind: string;
  feedActor: string;
  feedShown: number | null;
  memQuery: string;
  memKind: string;
  memTags: string[];
  memOpen: boolean;
  memEditing: number;
  memText: string;
  memFormKind: string;
  memTagsText: string;
  memSource: string;
  memError: string;
  memBusy: boolean;
  forgetOpen: boolean;
  forgetIndex: number;
  forgetText: string;
  forgetError: string;
  forgetBusy: boolean;
  draft: Config["project"];
  settingsBusy: boolean;
  settingsError: string;
  settingsSaved: string;
  integ: boolean[];
  integSaved: boolean[];
  integBusy: number | null;
  integError: string;
  dangerOpen: boolean;
  dangerKind: string;
  typed: string;
  dangerBusy: boolean;
  dangerError: string;
  alpine: AlpineLike & { $data?(el: Element): unknown };
  failed(): string;
  ask(name: string, detail: Record<string, unknown>): Promise<string>;
  boardData(): BoardData | null;
  snapBoard(): void;
  syncIntegrations(): Promise<void>;
  emit(name: string, detail: Record<string, unknown>): void;
  openIssue(id: string): void;
  copyKey(text: string): void;
  isDelete(): boolean;
  dangerReady(): boolean;
}

const copyOf = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const projectView: Register = (Alpine) => {
  Alpine.data("nqProjectView", (config: Config) => ({
    config,
    root: null as unknown as HTMLElement,
    alpine: Alpine as State["alpine"],
    tab: config.tab,
    moveError: "",
    listError: "",
    boardSnap: "",
    newOpen: false,
    newTitle: "",
    newType: "task",
    newPriority: "medium",
    newError: "",
    newBusy: false,
    filesError: "",
    uploading: false,
    feedKind: "all",
    feedActor: "all",
    feedShown: null as number | null,
    memQuery: "",
    memKind: "all",
    memTags: [] as string[],
    memOpen: false,
    memEditing: -1,
    memText: "",
    memFormKind: "fact",
    memTagsText: "",
    memSource: "",
    memError: "",
    memBusy: false,
    forgetOpen: false,
    forgetIndex: -1,
    forgetText: "",
    forgetError: "",
    forgetBusy: false,
    draft: { ...config.project },
    settingsBusy: false,
    settingsError: "",
    settingsSaved: "",
    integ: config.integrations.map((i) => i.connected),
    integSaved: config.integrations.map((i) => i.connected),
    integBusy: null as number | null,
    integError: "",
    dangerOpen: false,
    dangerKind: "",
    typed: "",
    dangerBusy: false,
    dangerError: "",

    init(this: State) {
      this.root = this.$el;
      this.$watch<string>("tab", (value) => this.root.dispatchEvent(new CustomEvent("nq-project-tab", { bubbles: true, detail: { tab: value } })));
      this.$watch("integ", () => void this.syncIntegrations());
      this.$watch("dangerOpen", (open: boolean) => {
        if (!open) {
          this.typed = "";
          this.dangerError = "";
        }
      });
      this.$nextTick(() => this.snapBoard());
    },

    failed(this: State) {
      return this.config.labels?.failed ?? "That did not work. Try again.";
    },
    /** Fire an event from the root and wait for the host. Returns an error message, or "" on success. */
    async ask(this: State, name: string, detail: Record<string, unknown>) {
      let pending: Promise<Outcome> | undefined;
      this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
      if (!pending) return this.failed();
      try {
        const result = await pending;
        return result && "error" in result && result.error ? result.error : "";
      } catch {
        return this.failed();
      }
    },
    emit(this: State, name: string, detail: Record<string, unknown>) {
      this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },

    /* ---------------------------------------------------------------- issues */
    openIssue(this: State, id: string) {
      this.emit("nq-project-open-issue", { id });
    },
    openAt(this: State, i: number) {
      const issue = this.config.issues[i];
      if (issue) this.openIssue(issue.id);
    },
    copyKey(text: string) {
      void navigator.clipboard?.writeText(text);
    },
    copyAt(this: State, i: number) {
      const issue = this.config.issues[i];
      if (issue) this.copyKey(issue.key);
    },

    boardData(this: State) {
      const el = this.root.querySelector('[data-pv-board] [data-slot="project-board"]');
      return el ? ((Alpine as unknown as { $data(el: Element): BoardData }).$data(el) ?? null) : null;
    },
    snapBoard(this: State) {
      const board = this.boardData();
      if (board) this.boardSnap = JSON.stringify(board.cards);
    },
    /** A drop on the board: the kanban already moved the card; tell the host and put it back if the host refuses. */
    async onMove(this: State, e: CustomEvent<{ cardId: string; toColumn: string; toIndex: number }>) {
      const { cardId, toColumn, toIndex } = e.detail;
      const message = await this.ask("nq-project-move-issue", { id: cardId, statusId: toColumn, index: toIndex });
      this.moveError = message;
      const board = this.boardData();
      if (!board) return;
      if (message && this.boardSnap) board.cards = JSON.parse(this.boardSnap) as BoardData["cards"];
      else this.snapBoard();
    },

    async onListEdit(this: State, e: CustomEvent<{ row: { id: string }; column: string; value: unknown; promise?: Promise<Outcome> }>) {
      const patch = projectListPatch(e.detail.column, e.detail.value);
      if (!patch) return;
      const id = String(e.detail.row.id);
      e.detail.promise = this.ask("nq-project-update-issue", { id, patch }).then((message) => (message ? { error: message } : undefined));
      await e.detail.promise;
    },
    async onListAction(this: State, e: CustomEvent<{ action: string; row: { id: string; key: string } }>) {
      const { action, row } = e.detail;
      if (action === "open") this.openIssue(String(row.id));
      else if (action === "copy") this.copyKey(String(row.key));
      else if (action === "delete") this.listError = await this.ask("nq-project-delete-issue", { id: String(row.id) });
    },
    onListRow(this: State, e: CustomEvent<{ row: { id: string } }>) {
      if (e.detail.row?.id !== undefined) this.openIssue(String(e.detail.row.id));
    },

    async submitNew(this: State) {
      const title = this.newTitle.trim();
      if (!title) {
        this.newError = this.config.labels?.title ?? "Title";
        return;
      }
      this.newBusy = true;
      const message = await this.ask("nq-project-create-issue", { input: { title, type: this.newType, priority: this.newPriority } });
      this.newBusy = false;
      this.newError = message;
      if (!message) {
        this.newTitle = "";
        this.newOpen = false;
      }
    },

    /* ----------------------------------------------------------------- files */
    chooseFiles(this: State) {
      this.root.querySelector<HTMLInputElement>("[data-pv-files]")?.click();
    },
    async pickFiles(this: State, e: Event) {
      const input = e.target as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      if (!files.length) return;
      this.uploading = true;
      this.filesError = await this.ask("nq-project-upload", { files });
      this.uploading = false;
      input.value = "";
    },
    async onFileAction(this: State, e: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = e.detail;
      if (action === "download") this.emit("nq-project-download-file", { id: String(row.id) });
      else if (action === "delete") this.filesError = await this.ask("nq-project-delete-file", { id: String(row.id) });
    },

    /* ------------------------------------------------------------------ feed */
    feedCountText(this: State) {
      const n = this.feedShown ?? this.config.feedTotal;
      return projectFill(this.config.labels?.feedCount ?? "%s events", new Intl.NumberFormat("en").format(n));
    },
    clearFeed(this: State) {
      this.feedKind = "all";
      this.feedActor = "all";
    },
    /** Hide the rows that do not match, the groups left empty and the count; runs again whenever a filter changes. */
    applyFeed(this: State) {
      const filter = { kind: this.feedKind, actor: this.feedActor };
      const active = filter.kind !== "all" || filter.actor !== "all";
      const lang = this.config.locale || undefined;
      let total = 0;
      this.root.querySelectorAll<HTMLElement>("[data-feed-group]").forEach((group) => {
        let count = 0;
        group.querySelectorAll<HTMLElement>("[data-feed-item]").forEach((item) => {
          const show = projectFeedMatches({ kind: item.dataset.kind ?? "other", actor: item.dataset.actor ?? "" }, filter);
          item.hidden = !show;
          if (show) count++;
        });
        total += count;
        group.hidden = count === 0;
        const label = group.querySelector<HTMLElement>("[data-feed-group-count]");
        if (label) {
          if (label.dataset.orig === undefined) label.dataset.orig = label.textContent ?? "";
          label.textContent = active ? new Intl.NumberFormat(lang).format(count) : label.dataset.orig;
        }
      });
      this.feedShown = active ? total : null;
      const none = this.root.querySelector<HTMLElement>("[data-feed-nomatch]");
      if (none) none.hidden = total > 0;
    },

    /* ---------------------------------------------------------------- memory */
    memFiltered(this: State) {
      return this.memQuery.trim() !== "" || this.memTags.length > 0 || this.memKind !== "all";
    },
    toggleMemTag(this: State, tag: string) {
      this.memTags = this.memTags.includes(tag) ? this.memTags.filter((t) => t !== tag) : [...this.memTags, tag];
    },
    clearMemory(this: State) {
      this.memQuery = "";
      this.memTags = [];
      this.memKind = "all";
    },
    applyMemory(this: State) {
      const filter = { query: this.memQuery, tags: [...this.memTags], kind: this.memKind };
      let shown = 0;
      this.root.querySelectorAll<HTMLElement>("[data-mem-item]").forEach((item) => {
        const tags = (item.dataset.tags ?? "").split("|").filter(Boolean);
        const show = projectMemoryMatches({ kind: item.dataset.kind ?? "fact", tags, haystack: item.dataset.hay ?? "" }, filter);
        item.hidden = !show;
        if (show) shown++;
      });
      const none = this.root.querySelector<HTMLElement>("[data-mem-nomatch]");
      if (none) none.hidden = shown > 0;
      const list = this.root.querySelector<HTMLElement>("[data-mem-list]");
      if (list) list.hidden = shown === 0;
    },
    /** Open the editor for the memory at index i of the list, or for a new one with -1. */
    openMemory(this: State, i: number) {
      const item = i >= 0 ? this.config.memory[i] : undefined;
      this.memEditing = item ? i : -1;
      this.memText = item?.text ?? "";
      this.memFormKind = item?.kind ?? "fact";
      this.memTagsText = (item?.tags ?? []).join(", ");
      this.memSource = item?.source ?? "";
      this.memError = "";
      this.memOpen = true;
    },
    async saveMemory(this: State) {
      const text = this.memText.trim();
      if (!text) {
        this.memError = this.config.labels?.memoryText ?? "What to remember";
        return;
      }
      const existing = this.memEditing >= 0 ? this.config.memory[this.memEditing] : undefined;
      this.memBusy = true;
      const detail: Record<string, unknown> = { input: { kind: this.memFormKind, text, tags: projectParseTags(this.memTagsText), source: this.memSource.trim() || undefined } };
      if (existing) detail.id = existing.id;
      const message = await this.ask("nq-project-memory-save", detail);
      this.memBusy = false;
      this.memError = message;
      if (!message) this.memOpen = false;
    },
    askForget(this: State, i: number) {
      const item = this.config.memory[i];
      if (!item) return;
      this.forgetIndex = i;
      this.forgetText = item.text;
      this.forgetError = "";
      this.forgetOpen = true;
    },
    async forgetMemory(this: State) {
      const item = this.config.memory[this.forgetIndex];
      if (!item) return;
      this.forgetBusy = true;
      const message = await this.ask("nq-project-memory-forget", { id: item.id });
      this.forgetBusy = false;
      this.forgetError = message;
      if (!message) this.forgetOpen = false;
    },

    /* -------------------------------------------------------------- settings */
    touchDraft(this: State) {
      this.settingsSaved = "";
    },
    async saveProject(this: State, message: string) {
      if (!this.draft.name.trim()) {
        this.settingsError = this.config.labels?.name ?? "Name";
        return;
      }
      this.settingsBusy = true;
      const patch = {
        name: this.draft.name.trim(),
        client: this.draft.client.trim() || undefined,
        status: this.draft.status,
        startDate: this.draft.startDate || null,
        dueDate: this.draft.dueDate || null,
        budget: projectParseBudget(this.draft.budget),
      };
      const error = await this.ask("nq-project-save", { patch });
      this.settingsBusy = false;
      this.settingsError = error;
      this.settingsSaved = error ? "" : message;
    },
    integLabel(this: State, i: number) {
      const l = this.config.labels;
      return `${this.integ[i] ? (l?.disconnect ?? "Disconnect") : (l?.connect ?? "Connect")}: ${this.config.integrations[i]?.name ?? ""}`;
    },
    async syncIntegrations(this: State) {
      if (this.integBusy !== null) return;
      const i = this.integ.findIndex((on, n) => on !== this.integSaved[n]);
      if (i < 0) return;
      const next = this.integ[i] as boolean;
      this.integBusy = i;
      const message = await this.ask("nq-project-integration", { id: this.config.integrations[i]?.id, connected: next });
      this.integBusy = null;
      this.integError = message;
      if (message) this.integ[i] = this.integSaved[i] as boolean;
      else this.integSaved[i] = next;
    },

    /* ---------------------------------------------------------- danger zone */
    askDanger(this: State, kind: string) {
      this.dangerKind = kind;
      this.typed = "";
      this.dangerError = "";
      this.dangerOpen = true;
    },
    isDelete(this: State) {
      return this.dangerKind === "delete";
    },
    dangerReady(this: State) {
      return !this.isDelete() || this.typed.trim().toLowerCase() === this.config.projectKey.toLowerCase();
    },
    async runDanger(this: State) {
      if (!this.dangerReady()) return;
      this.dangerBusy = true;
      const message = await this.ask(this.isDelete() ? "nq-project-delete" : "nq-project-archive", {});
      this.dangerBusy = false;
      this.dangerError = message;
      if (!message) this.dangerOpen = false;
    },
  }));
};
