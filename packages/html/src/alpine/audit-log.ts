// nqAuditLog: who did what, to which entity, from where (web, API or MCP) and when. Search and filter by actor, action, entity, channel and dates,
// sort, page, open a row for the field-level before and after, and set the retention. The markup is the React AuditLog's, rendered by
// <x-nq::audit-log>. You send the entries; filtering runs on them in the browser.
//
//   <div data-slot="audit-log" x-data="nqAuditLog({ entries: [...], actionLabels: {...}, entityLabels: {...}, retention: { days: 90, editable: true }, strings: {...} })"> ... </div>
//
// Entries: { id, at (ISO string, ms or Date), actor: { id, name, email?, avatar? } | null, action, entity: { type, id?, label? }, channel: web | api | mcp, ip?, changes?: [{ field, before?, after? }] }.
// Events in (on the root): nq-audit-set { entries }.
// Events out (bubbling):
//   nq-audit-retention { days, wait(promise) }  the select moved; pass a promise to wait() that rejects or resolves { error } to roll it back
//   nq-audit-refresh { wait(promise) }          the Refresh button (shown when `refresh` is set)
// The helpers are a copy of packages/web/src/components/audit-log/audit-rules.ts (./audit-log-logic.ts).

import {
  changeKind,
  expiringCount,
  filterEntries,
  formatChangeValue,
  type AuditEntry,
} from "./audit-log-logic";
import type { Magics, Register } from "./types";

interface Config {
  entries?: AuditEntry[];
  actionLabels?: Record<string, string>;
  entityLabels?: Record<string, string>;
  pageSize?: number;
  locale?: string;
  retention?: { days: number | null; options?: (number | null)[]; editable?: boolean } | null;
  strings?: Record<string, string>;
}

interface Range {
  from: string | null;
  to: string | null;
}

interface SortState {
  id: string;
  direction: "asc" | "desc";
}

interface State extends Magics, Methods {
  entries: AuditEntry[];
  actionLabels: Record<string, string>;
  entityLabels: Record<string, string>;
  pageSize: number;
  locale: string;
  strings: Record<string, string>;
  query: string;
  facet: Record<string, boolean>;
  range: Range;
  sort: SortState | null;
  page: number;
  active: number;
  shown: Record<string, boolean>;
  detailsOpen: boolean;
  current: AuditEntry | null;
  details: Details;
  refreshing: boolean;
  retentionKey: string;
  appliedKey: string;
  retentionEditable: boolean;
  retentionBusy: boolean;
  notice: { tone: "success" | "danger"; text: string } | null;
  announce: string;
  filtered: AuditEntry[];
  rows: AuditEntry[];
}

interface Details {
  title: string;
  description: string;
  action: string;
  entity: string;
  entityType: string;
  channel: string;
  ip: string;
  changes: { field: string; kind: string; kindLabel: string; before: string; after: string }[];
  fieldCount: string;
}
const EMPTY_DETAILS: Details = { title: "", description: "", action: "", entity: "", entityType: "", channel: "", ip: "", changes: [], fieldCount: "" };
const COLUMNS = ["when", "actor", "action", "entity", "channel", "ip"];
const keyOf = (d: number | null) => (d === null ? "forever" : String(d));
const toDay = (iso: string | null): Date | null => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

export const auditLog: Register = (Alpine) => {
  Alpine.data("nqAuditLog", (cfg: Config = {}) => ({
    entries: [...(cfg.entries ?? [])] as AuditEntry[],
    actionLabels: cfg.actionLabels ?? {},
    entityLabels: cfg.entityLabels ?? {},
    pageSize: cfg.pageSize ?? 10,
    locale: cfg.locale ?? "en",
    strings: cfg.strings ?? {},
    query: "",
    facet: {} as Record<string, boolean>,
    range: { from: null, to: null } as Range,
    sort: { id: "when", direction: "desc" } as SortState | null,
    page: 0,
    active: 0,
    shown: Object.fromEntries(COLUMNS.map((c) => [c, c !== "ip"])) as Record<string, boolean>,
    detailsOpen: false,
    current: null as AuditEntry | null,
    details: EMPTY_DETAILS as Details,
    refreshing: false,
    retentionKey: keyOf(cfg.retention?.days ?? null),
    appliedKey: keyOf(cfg.retention?.days ?? null),
    retentionEditable: cfg.retention?.editable !== false,
    retentionBusy: false,
    notice: null as { tone: "success" | "danger"; text: string } | null,
    announce: "",
    filtered: [] as AuditEntry[],
    rows: [] as AuditEntry[],

    init(this: State) {
      this.refilter();
      this.$watch("query", () => this.refilter());
      this.$watch("facet", () => this.refilter());
      this.$watch("range", () => this.refilter());
      this.$watch("retentionKey", (v: string) => void this.changeRetention(v));
      this.$root.addEventListener("nq-audit-set", (e: Event) => {
        const d = (e as CustomEvent<{ entries?: AuditEntry[] }>).detail;
        if (d?.entries) {
          this.entries = [...d.entries];
          this.refilter();
        }
      });
    },

    // ---- strings and names
    say(this: State, key: string, vars: Record<string, string | number> = {}): string {
      return fill(this.strings[key] ?? key, vars);
    },
    actionName(this: State, id: string): string {
      return this.actionLabels[id] ?? id;
    },
    entityName(this: State, id: string): string {
      return this.entityLabels[id] ?? id;
    },
    actorName(this: State, e: AuditEntry): string {
      return e.actor?.name ?? this.strings.system ?? "System";
    },
    channelName(this: State, e: AuditEntry): string {
      return this.strings["channel_" + e.channel] ?? e.channel;
    },
    hasLabel(this: State, e: AuditEntry): boolean {
      return !!this.actionLabels[e.action];
    },
    entityTitle(this: State, e: AuditEntry): string {
      return e.entity.label ?? this.entityName(e.entity.type);
    },
    initials(e: AuditEntry): string {
      const words = (e.actor?.name ?? "").trim().split(/\s+/).filter(Boolean);
      const first = (w: string) => Array.from(w)[0] ?? "";
      return ((words[0] ? first(words[0]) : "") + (words.length > 1 ? first(words[words.length - 1]!) : "")).toUpperCase();
    },
    time(this: State, e: AuditEntry, long = false): string {
      const d = new Date(e.at);
      if (Number.isNaN(d.getTime())) return "";
      return new Intl.DateTimeFormat(this.locale, long ? { dateStyle: "long", timeStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" }).format(d);
    },
    num(this: State, n: number): string {
      return new Intl.NumberFormat(this.locale).format(n);
    },

    // ---- filtering, sorting, paging
    refilter(this: State & Methods) {
      const on = (kind: string) =>
        Object.entries(this.facet)
          .filter(([k, v]) => v && k.startsWith(kind + "|"))
          .map(([k]) => k.slice(kind.length + 1));
      const q = this.query.trim().toLowerCase();
      let list = filterEntries(this.entries, {
        actors: on("actor"),
        actions: on("action"),
        entities: on("entity"),
        channels: on("channel") as never,
        from: toDay(this.range.from),
        to: toDay(this.range.to),
      });
      if (q) {
        list = list.filter((e) => {
          const hay = [
            e.actor?.name ?? "",
            e.actor?.email ?? "",
            e.action,
            this.actionName(e.action),
            e.entity.type,
            this.entityName(e.entity.type),
            e.entity.label ?? "",
            e.entity.id ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });
      }
      const s = this.sort;
      if (s) {
        const value = (e: AuditEntry): string | number => {
          switch (s.id) {
            case "when":
              return new Date(e.at).getTime();
            case "actor":
              return this.actorName(e).toLowerCase();
            case "action":
              return this.actionName(e.action).toLowerCase();
            case "entity":
              return (e.entity.label ?? e.entity.type).toLowerCase();
            default:
              return e.channel;
          }
        };
        const dir = s.direction === "asc" ? 1 : -1;
        list = [...list].sort((a, b) => {
          const x = value(a);
          const y = value(b);
          return (x < y ? -1 : x > y ? 1 : 0) * dir;
        });
      }
      this.filtered = list;
      this.page = Math.min(this.page, Math.max(this.pageCount - 1, 0));
      this.rows = this.pageSize > 0 ? list.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize) : list;
      this.announce = this.say("announce", { n: this.num(list.length) });
    },
    get pageCount(): number {
      const self = this as unknown as State;
      return self.pageSize > 0 ? Math.max(Math.ceil(self.filtered.length / self.pageSize), 1) : 1;
    },
    get paged(): boolean {
      const self = this as unknown as State;
      return self.pageSize > 0 && self.filtered.length > self.pageSize;
    },
    get rangeText(): string {
      const self = this as unknown as State & Methods;
      const total = self.filtered.length;
      const from = total === 0 ? 0 : self.page * self.pageSize + 1;
      const to = Math.min((self.page + 1) * self.pageSize, total);
      return self.say("range", { from: self.num(from), to: self.num(to), total: self.num(total) });
    },
    setPage(this: State & Methods, n: number) {
      this.page = Math.max(0, Math.min(n, this.pageCount - 1));
      this.active = 0;
      this.refilter();
    },
    get pageBack(): boolean {
      return (this as unknown as State).page === 0;
    },
    get pageEnd(): boolean {
      const self = this as unknown as State & { pageCount: number };
      return self.page >= self.pageCount - 1;
    },
    toggleSort(this: State & Methods, id: string) {
      const s = this.sort;
      this.sort = !s || s.id !== id ? { id, direction: "asc" } : s.direction === "asc" ? { id, direction: "desc" } : null;
      this.page = 0;
      this.refilter();
    },
    sortOf(this: State, id: string): "asc" | "desc" | null {
      return this.sort?.id === id ? this.sort.direction : null;
    },
    ariaSort(this: State & Methods, id: string): string {
      const d = this.sortOf(id);
      return d === "asc" ? "ascending" : d === "desc" ? "descending" : "none";
    },
    facetCount(this: State, kind: string): number {
      return Object.entries(this.facet).filter(([k, v]) => v && k.startsWith(kind + "|")).length;
    },
    resetFacet(this: State, kind: string) {
      for (const k of Object.keys(this.facet)) if (k.startsWith(kind + "|")) this.facet[k] = false;
    },
    get hasDates(): boolean {
      const r = (this as unknown as State).range;
      return !!(r.from || r.to);
    },
    clearDates(this: State) {
      this.range = { from: null, to: null };
    },
    get isFiltered(): boolean {
      const self = this as unknown as State & { hasDates: boolean };
      return self.query.trim() !== "" || self.hasDates || Object.values(self.facet).some(Boolean);
    },
    get firstRun(): boolean {
      return (this as unknown as State).entries.length === 0;
    },
    get noMatch(): boolean {
      const self = this as unknown as State & { firstRun: boolean };
      return !self.firstRun && self.filtered.length === 0;
    },
    get isEmpty(): boolean {
      return (this as unknown as State).filtered.length === 0;
    },
    resetFilters(this: State) {
      this.query = "";
      this.range = { from: null, to: null };
      for (const k of Object.keys(this.facet)) this.facet[k] = false;
    },
    shownCount(this: State): number {
      return COLUMNS.filter((c) => this.shown[c]).length;
    },
    get gridStyle(): string {
      return `grid-template-columns: repeat(${(this as unknown as State & Methods).shownCount()}, auto)`;
    },
    lastShown(this: State & Methods, id: string): boolean {
      return !!this.shown[id] && this.shownCount() === 1;
    },

    // ---- rows and the details dialog
    show(this: State & Methods, e: AuditEntry) {
      this.current = e;
      this.details = this.buildDetails(e);
      this.detailsOpen = true;
    },
    rowKey(this: State & Methods, ev: KeyboardEvent, e: AuditEntry, index: number) {
      if (ev.target !== ev.currentTarget) return;
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this.show(e);
        return;
      }
      const to = ev.key === "ArrowDown" ? index + 1 : ev.key === "ArrowUp" ? index - 1 : ev.key === "Home" ? 0 : ev.key === "End" ? this.rows.length - 1 : null;
      if (to === null) return;
      ev.preventDefault();
      const i = Math.max(0, Math.min(to, this.rows.length - 1));
      this.active = i;
      const rowEls = (ev.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>("[data-row]");
      this.$nextTick(() => rowEls?.[i]?.focus());
    },
    buildDetails(this: State & Methods, e: AuditEntry): Details {
      const self = this;
      const changes = (e.changes ?? []).map((c) => {
        const kind = changeKind(c);
        return {
          field: c.field,
          kind,
          kindLabel: self.strings[kind] ?? kind,
          before: formatChangeValue(c.before),
          after: formatChangeValue(c.after),
        };
      });
      return {
        title: self.actionName(e.action),
        description: `${self.actorName(e)} · ${self.time(e, true)}`,
        action: e.action,
        entity: self.entityTitle(e),
        entityType: self.entityName(e.entity.type),
        channel: self.channelName(e),
        ip: e.ip ?? "",
        changes,
        fieldCount: changes.length ? self.say(changes.length === 1 ? "fieldOne" : "fieldMany", { n: self.num(changes.length) }) : "",
      };
    },

    // ---- refresh
    async refresh(this: State) {
      this.refreshing = true;
      const waits: Promise<unknown>[] = [];
      this.$dispatch("nq-audit-refresh", { wait: (p: Promise<unknown>) => void waits.push(Promise.resolve(p)) });
      try {
        await Promise.all(waits);
      } finally {
        this.refreshing = false;
      }
    },

    // ---- retention
    get retentionDays(): number | null {
      const k = (this as unknown as State).appliedKey;
      return k === "forever" ? null : Number(k);
    },
    get retentionLocked(): boolean {
      const self = this as unknown as State;
      return !self.retentionEditable || self.retentionBusy;
    },
    get expiring(): number {
      const self = this as unknown as State & { retentionDays: number | null };
      return expiringCount(self.entries, self.retentionDays);
    },
    get hasExpiring(): boolean {
      return (this as unknown as { expiring: number }).expiring > 0;
    },
    get expiringText(): string {
      const self = this as unknown as State & { expiring: number } & Methods;
      return self.say(self.expiring === 1 ? "expiringOne" : "expiringMany", { n: self.num(self.expiring) });
    },
    get noticeSuccess(): boolean {
      return (this as unknown as State).notice?.tone === "success";
    },
    get noticeDanger(): boolean {
      return (this as unknown as State).notice?.tone === "danger";
    },
    async changeRetention(this: State, key: string) {
      if (key === this.appliedKey) return;
      const previous = this.appliedKey;
      this.appliedKey = key;
      this.notice = null;
      this.retentionBusy = true;
      const days = key === "forever" ? null : Number(key);
      const waits: Promise<unknown>[] = [];
      this.$dispatch("nq-audit-retention", { days, wait: (p: Promise<unknown>) => void waits.push(Promise.resolve(p)) });
      try {
        const results = await Promise.all(waits);
        for (const r of results) {
          const err = r && typeof r === "object" ? (r as { error?: string }).error : undefined;
          if (err) throw new Error(err);
        }
        this.notice = { tone: "success", text: this.strings.retentionSaved ?? "" };
      } catch (e) {
        this.appliedKey = previous;
        this.retentionKey = previous;
        this.notice = { tone: "danger", text: e instanceof Error && e.message ? e.message : (this.strings.retentionFailed ?? "") };
      } finally {
        this.retentionBusy = false;
      }
    },
  }));
};

interface Methods {
  refilter(): void;
  say(key: string, vars?: Record<string, string | number>): string;
  num(n: number): string;
  actionName(id: string): string;
  entityName(id: string): string;
  actorName(e: AuditEntry): string;
  channelName(e: AuditEntry): string;
  entityTitle(e: AuditEntry): string;
  time(e: AuditEntry, long?: boolean): string;
  sortOf(id: string): "asc" | "desc" | null;
  shownCount(): number;
  show(e: AuditEntry): void;
  buildDetails(e: AuditEntry): Details;
  changeRetention(key: string): Promise<void>;
  pageCount: number;
}
