// nqKnowledgeGaps: questions the brain could not answer, grouped Open / Indexed / Dismissed, most asked first. Each row can be
// marked indexed, dismissed or reopened. The markup is the React KnowledgeGaps' (see the Blade component); rows come from `gaps`.
//
//   <section data-slot="knowledge-gaps" x-data="nqKnowledgeGaps([{ id: 'g1', query: 'Ship to Jeddah?', hits: 9, firstSeen: '2026-09-01', lastSeen: '2026-09-20', status: 'open' }])"> … </section>
//
// `gaps` is x-modelable. Moving a gap dispatches the bubbling `nq-knowledge-gap-resolve` with { gap, status, promise? }: a listener
// may set `event.detail.promise` (a Promise, or one resolving to { error }); on success the gap moves, otherwise it stays and the
// message shows the error. Options: status ("" for all), locale, interactive (false hides the row buttons),
// labels ({ resolved: { open, indexed, dismissed }, failed }). The row context menu of the other stacks is not ported here.

import type { Magics, Register } from "./types";

type Status = "open" | "indexed" | "dismissed";
const TRANSITIONS: Record<Status, Status[]> = { open: ["indexed", "dismissed"], indexed: ["open", "dismissed"], dismissed: ["open", "indexed"] };

interface Gap {
  id: string;
  query: string;
  hits: number;
  firstSeen: string | number;
  lastSeen: string | number;
  status: Status;
  resolution?: string;
}

interface Options {
  status?: Status | "";
  locale?: string;
  interactive?: boolean;
  labels?: { resolved?: Partial<Record<Status, string>>; failed?: string };
}

interface State extends Magics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any;
  gaps: Gap[];
  filter: Status | "";
  busy: string | null;
  message: string;
  failed: boolean;
  interactive: boolean;
  locale: string;
  resolved: Record<Status, string>;
  failText: string;
  root: HTMLElement | null;
}

export const knowledgeGaps: Register = (Alpine) => {
  Alpine.data("nqKnowledgeGaps", (initial: Gap[] = [], options: Options = {}) => ({
    gaps: (initial ?? []).map((g) => ({ ...g })),
    filter: (options.status ?? "") as Status | "",
    busy: null as string | null,
    message: "",
    failed: false,
    interactive: options.interactive !== false,
    locale: options.locale ?? (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"),
    resolved: { open: "Reopened.", indexed: "Marked as indexed.", dismissed: "Dismissed.", ...options.labels?.resolved } as Record<Status, string>,
    failText: options.labels?.failed ?? "The change could not be saved. Try again.",
    root: null as HTMLElement | null,
    init(this: State) {
      this.root = this.$el;
    },
    group(this: State, status: Status): Gap[] {
      return this.gaps.filter((g) => g.status === status).sort((a, b) => b.hits - a.hits || new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    },
    count(this: State, status: Status): string {
      return this.num(this.gaps.filter((g) => g.status === status).length);
    },
    shown(this: State, status: Status): boolean {
      return (this.filter === "" || this.filter === status) && this.gaps.some((g) => g.status === status);
    },
    get max(): number {
      return Math.max(0, ...(this as unknown as State).gaps.map((g) => g.hits));
    },
    width(this: State, g: Gap): string {
      const max = (this as unknown as { max: number }).max;
      return `width: ${Math.max(8, max <= 0 ? 0 : (g.hits / max) * 100)}%`;
    },
    num(this: State, n: number): string {
      return new Intl.NumberFormat(`${this.locale}-u-nu-latn`).format(n);
    },
    date(this: State, v: string | number): string {
      return new Intl.DateTimeFormat(`${this.locale}-u-nu-latn`, { dateStyle: "medium" }).format(new Date(v));
    },
    iso(v: string | number): string {
      return new Date(v).toISOString();
    },
    relative(this: State, v: string | number): string {
      const diff = new Date(v).getTime() - Date.now();
      const rtf = new Intl.RelativeTimeFormat(`${this.locale}-u-nu-latn`, { numeric: "auto" });
      const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536e6], ["month", 2592e6], ["day", 864e5], ["hour", 36e5], ["minute", 6e4]];
      for (const [unit, ms] of units) if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
      return rtf.format(0, "second");
    },
    can(this: State, g: Gap, to: Status): boolean {
      return this.interactive && TRANSITIONS[g.status].includes(to);
    },
    setFilter(this: State, status: Status | "") {
      this.filter = status;
    },
    async move(this: State, g: Gap, to: Status) {
      if (this.busy || !this.can(g, to)) return;
      this.busy = `${g.id}:${to}`;
      this.message = "";
      this.failed = false;
      const detail: { gap: Gap; status: Status; promise?: Promise<unknown> | unknown } = { gap: { ...g }, status: to };
      this.root?.dispatchEvent(new CustomEvent("nq-knowledge-gap-resolve", { bubbles: true, detail }));
      try {
        const r = (await detail.promise) as { error?: string } | undefined | void;
        if (r && typeof r === "object" && r.error) {
          this.message = r.error;
          this.failed = true;
        } else {
          g.status = to;
          this.message = this.resolved[to];
        }
      } catch (e) {
        this.message = e instanceof Error && e.message ? e.message : this.failText;
        this.failed = true;
      }
      this.busy = null;
    },
  }));
};
