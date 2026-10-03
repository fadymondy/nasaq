// nqLogViewer: a log stream with level filters and counts, search with highlights (optionally a regular expression), a time range, follow-the-tail
// with a jump button, pause and resume (live tail), loading older entries, server-side filtering (manual), timestamps, keyboard navigation, a detail
// panel and a windowed list of fixed-height rows. The markup is the React LogViewer's,
// rendered by <x-nq::log-viewer>. Always left-to-right; only the chrome is translated.
//
//   <div data-slot="log-viewer" dir="ltr" x-data="nqLogViewer({ entries: [...], streaming: true, strings: {...} })"> ... </div>
//
// Entries: { id, time (ms, ISO or Date), level, message, source?, fields? }, oldest first. Append from anywhere with an event on the element:
//   el.dispatchEvent(new CustomEvent('nq-log-write', { detail: { entries: [...] } }))     // append (replace: true swaps everything; prepend: true adds older entries and keeps the reader's place)
//   el.dispatchEvent(new CustomEvent('nq-log-state', { detail: { streaming: false } }))   // the stream ended; also hasOlder, loadingOlder, total, counts
// Events out (bubbling): nq-log-download { entries } (cancelable: preventDefault to handle the download yourself), nq-log-copy { text },
// nq-log-filter { levels, query, regex, range, since } (the reader changed a filter; for a server that filters, see `manual`),
// nq-log-older (the reader asked for older entries: fetch, then nq-log-write { entries, prepend: true }), nq-log-live { live } (pause / resume).
// The helpers are a copy of packages/web/src/components/log-viewer/log-viewer-format.ts (./log-viewer-logic.ts).

import { copyText } from "./copy-button";
import {
  compileMatcher,
  countByLevel,
  entriesUntil,
  entryText,
  fieldsToText,
  filterLogs,
  formatLogTime,
  LOG_LEVELS,
  type LogEntry,
  type LogLevel,
  type LogRange,
  logsToText,
  rangeSince,
  splitByRanges,
  virtualWindow,
} from "./log-viewer-logic";
import type { Magics, Register } from "./types";

interface Config {
  entries?: LogEntry[];
  streaming?: boolean;
  follow?: boolean;
  defaultLevels?: LogLevel[];
  defaultQuery?: string;
  timestamps?: boolean;
  utc?: boolean;
  rowHeight?: number;
  downloadFilename?: string;
  /** The server filters: entries are shown as given and filter changes are reported with nq-log-filter. */
  manual?: boolean;
  counts?: Partial<Record<LogLevel, number>>;
  total?: number | null;
  ranges?: LogRange[];
  defaultRange?: string;
  hasOlder?: boolean;
  liveTail?: boolean;
  strings?: Record<string, string>;
}

interface Item {
  entry: LogEntry;
  index: number;
  top: number;
}

interface LogViewerState extends Magics {
  entries: LogEntry[];
  streaming: boolean;
  following: boolean;
  levels: LogLevel[];
  query: string;
  regex: boolean;
  showTime: boolean;
  utc: boolean;
  rowHeight: number;
  downloadFilename: string;
  manual: boolean;
  extraCounts: Partial<Record<LogLevel, number>>;
  serverTotal: number | null;
  ranges: LogRange[];
  rangeId: string;
  hasOlder: boolean;
  loadingOlder: boolean;
  liveTail: boolean;
  paused: boolean;
  pausedId: LogEntry["id"] | null;
  waiting: number;
  shownCount: number;
  anchor: { height: number; top: number } | null;
  reportQueued: boolean;
  strings: Record<string, string>;
  rows: LogEntry[];
  counts: Record<LogLevel, number>;
  invalid: boolean;
  selected: LogEntry["id"] | null;
  current: LogEntry | null;
  scrollTop: number;
  viewport: number;
  flash: string;
  flashTimer: ReturnType<typeof setTimeout> | undefined;
  observer: ResizeObserver | undefined;
  uid: string;
  readonly levelList: readonly LogLevel[];
  readonly filtering: boolean;
  readonly canReset: boolean;
  readonly showJump: boolean;
  readonly showResume: boolean;
  readonly head: number;
  readonly olderOpen: boolean;
  readonly waitingText: string;
  readonly liveLabel: string;
  readonly visible: Item[];
  readonly count: string;
  readonly currentFields: [string, string][];
  refilter(): void;
  pin(): void;
  measure(): void;
  onScroll(): void;
  setFollowing(on: boolean): void;
  isOn(level: LogLevel): boolean;
  toggleLevel(level: LogLevel): void;
  levelCount(level: LogLevel): number;
  reset(): void;
  select(id: LogEntry["id"] | null): void;
  toggleRow(id: LogEntry["id"]): void;
  reveal(index: number): void;
  onKey(e: KeyboardEvent): void;
  write(entries: LogEntry | LogEntry[], replace?: boolean, prepend?: boolean): void;
  report(): void;
  loadOlder(): void;
  setLive(live: boolean): void;
  time(entry: LogEntry): string;
  currentTime(): string;
  pieces(entry: LogEntry): { text: string; match: boolean }[];
  rowId(entry: LogEntry): string;
  rowClass(entry: LogEntry): string;
  levelClass(level: LogLevel): string;
  tag(level: LogLevel): string;
  chipClass(level: LogLevel): string;
  rowTitle(entry: LogEntry): string | null;
  copyVisible(): Promise<void>;
  copyEntry(): Promise<void>;
  download(): void;
  doFlash(message: string): void;
}

/** Level text uses a token colour and always a written label, so it never relies on colour alone. */
const LEVEL_TEXT: Record<LogLevel, string> = {
  trace: "text-muted-foreground",
  debug: "text-nq-info-text",
  info: "text-nq-success-text",
  warn: "text-nq-warning-text",
  error: "text-nq-danger-text",
  fatal: "text-nq-danger-text font-bold",
};
const LEVEL_ROW: Record<LogLevel, string> = {
  trace: "",
  debug: "",
  info: "",
  warn: "bg-nq-warning-soft/50",
  error: "bg-nq-danger-soft/60",
  fatal: "bg-nq-danger-soft",
};
/** Height of the "Load older" bar at the top of the list, in pixels. */
const OLDER_BAR = 36;
const LEVEL_TAG: Record<LogLevel, string> = { trace: "TRACE", debug: "DEBUG", info: "INFO", warn: "WARN", error: "ERROR", fatal: "FATAL" };

export const logViewer: Register = (Alpine) => {
  Alpine.data("nqLogViewer", (cfg: Config = {}) => ({
    entries: [...(cfg.entries ?? [])] as LogEntry[],
    streaming: !!cfg.streaming,
    following: cfg.follow !== false,
    levels: [...(cfg.defaultLevels ?? LOG_LEVELS)] as LogLevel[],
    query: cfg.defaultQuery ?? "",
    regex: false,
    showTime: cfg.timestamps !== false,
    utc: !!cfg.utc,
    rowHeight: cfg.rowHeight ?? 24,
    downloadFilename: cfg.downloadFilename ?? "logs.log",
    manual: !!cfg.manual,
    extraCounts: cfg.counts ?? ({} as Partial<Record<LogLevel, number>>),
    serverTotal: cfg.total ?? null,
    ranges: cfg.ranges ?? ([] as LogRange[]),
    rangeId: cfg.defaultRange ?? cfg.ranges?.[cfg.ranges.length - 1]?.id ?? "",
    hasOlder: !!cfg.hasOlder,
    loadingOlder: false,
    liveTail: !!cfg.liveTail,
    paused: false,
    pausedId: null as LogEntry["id"] | null,
    waiting: 0,
    shownCount: 0,
    anchor: null as { height: number; top: number } | null,
    reportQueued: false,
    strings: cfg.strings ?? {},
    rows: [] as LogEntry[],
    counts: { trace: 0, debug: 0, info: 0, warn: 0, error: 0, fatal: 0 } as Record<LogLevel, number>,
    invalid: false,
    selected: null as LogEntry["id"] | null,
    current: null as LogEntry | null,
    scrollTop: 0,
    viewport: 0,
    flash: "",
    uid: "",
    flashTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    observer: undefined as ResizeObserver | undefined,
    get levelList() {
      return LOG_LEVELS;
    },
    get filtering() {
      const self = this as unknown as LogViewerState;
      const range = self.ranges.find((r) => r.id === self.rangeId);
      return self.levels.length < LOG_LEVELS.length || self.query !== "" || (!!range && range.ms !== null);
    },
    get canReset() {
      const self = this as unknown as LogViewerState;
      return self.entries.length > 0 && self.filtering;
    },
    get showJump() {
      const self = this as unknown as LogViewerState;
      return !self.following && self.rows.length > 0 && !self.paused;
    },
    get showResume() {
      const self = this as unknown as LogViewerState;
      return self.paused && self.waiting > 0;
    },
    get head() {
      const self = this as unknown as LogViewerState;
      return self.hasOlder || self.loadingOlder ? OLDER_BAR : 0;
    },
    get olderOpen() {
      const self = this as unknown as LogViewerState;
      return self.hasOlder || self.loadingOlder;
    },
    get waitingText() {
      const self = this as unknown as LogViewerState;
      return (self.waiting === 1 ? self.strings.newOne : self.strings.newMany)?.replace("{n}", String(self.waiting)) ?? "";
    },
    get liveLabel() {
      const self = this as unknown as LogViewerState;
      return (self.paused ? self.strings.resume : self.strings.pause) ?? "";
    },
    get visible() {
      const self = this as unknown as LogViewerState;
      const head = self.head;
      const w = virtualWindow({ scrollTop: Math.max(0, self.scrollTop - head), viewport: self.viewport, rowHeight: self.rowHeight, count: self.rows.length });
      return self.rows.slice(w.start, w.end).map((entry, i) => ({ entry, index: w.start + i, top: head + (w.start + i) * self.rowHeight }));
    },
    get count() {
      const self = this as unknown as LogViewerState;
      const shown = self.rows.length;
      const total = self.serverTotal ?? self.shownCount;
      return (shown === total ? self.strings.countAll : self.strings.countSome)?.replace("{shown}", String(shown)).replace("{total}", String(total)) ?? "";
    },
    get currentFields() {
      const f = (this as unknown as LogViewerState).current?.fields;
      return f && !Array.isArray(f) ? Object.entries(f).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)] as [string, string]) : [];
    },
    init(this: LogViewerState) {
      this.uid = this.$id("log-viewer");
      this.refilter();
      // Filter changes are also reported, for a server that filters; the initial state is not.
      for (const key of ["query", "regex", "levels", "rangeId"]) {
        this.$watch(key, () => {
          this.refilter();
          this.report();
        });
      }
      this.measure();
      const list = this.$refs.list;
      if (list && typeof ResizeObserver !== "undefined") {
        this.observer = new ResizeObserver(() => this.measure());
        this.observer.observe(list);
      }
      this.$nextTick(() => this.pin());
      const el = this.$root;
      el.addEventListener("nq-log-write", (e: Event) => {
        const d = (e as CustomEvent<{ entries?: LogEntry | LogEntry[]; replace?: boolean; prepend?: boolean }>).detail;
        if (d?.entries !== undefined) this.write(d.entries, d.replace, d.prepend);
      });
      el.addEventListener("nq-log-state", (e: Event) => {
        const d = (e as CustomEvent<{ streaming?: boolean; hasOlder?: boolean; loadingOlder?: boolean; total?: number | null; counts?: Partial<Record<LogLevel, number>> }>).detail;
        if (typeof d?.streaming === "boolean") this.streaming = d.streaming;
        if (typeof d?.hasOlder === "boolean") this.hasOlder = d.hasOlder;
        if (typeof d?.loadingOlder === "boolean") this.loadingOlder = d.loadingOlder;
        if (d && "total" in d) this.serverTotal = d.total ?? null;
        if (d?.counts) this.extraCounts = d.counts;
        if (d) this.refilter();
      });
    },
    destroy(this: LogViewerState) {
      this.observer?.disconnect();
      if (this.flashTimer) clearTimeout(this.flashTimer);
    },
    refilter(this: LogViewerState) {
      // Paused, the list stops at the last entry it had; later entries wait and are counted.
      const shown = this.paused ? entriesUntil(this.entries, this.pausedId) : this.entries;
      this.shownCount = shown.length;
      this.waiting = this.paused ? this.entries.length - shown.length : 0;
      const range = this.ranges.find((r) => r.id === this.rangeId);
      if (this.manual) {
        this.rows = [...shown];
        this.invalid = compileMatcher(this.query, this.regex) === "invalid";
      } else {
        const result = filterLogs(shown, { levels: new Set(this.levels), query: this.query, regex: this.regex, since: rangeSince(range) });
        this.rows = result.entries;
        this.invalid = result.invalid;
      }
      this.counts = { ...countByLevel(shown), ...this.extraCounts };
      this.current = this.selected === null ? null : (this.rows.find((r) => r.id === this.selected) ?? null);
      if (this.selected !== null && !this.entries.some((e) => e.id === this.selected)) this.selected = null;
      this.$nextTick(() => {
        const list = this.$refs.list;
        const a = this.anchor;
        // Keep the reader's place when older entries are prepended.
        if (list && a && list.scrollHeight !== a.height) {
          list.scrollTop = a.top + (list.scrollHeight - a.height);
          this.anchor = null;
          this.scrollTop = list.scrollTop;
        }
        this.pin();
      });
    },
    report(this: LogViewerState) {
      // Several filters can change at once (reset); one event per change set.
      if (this.reportQueued) return;
      this.reportQueued = true;
      queueMicrotask(() => {
        this.reportQueued = false;
        const range = this.ranges.find((r) => r.id === this.rangeId) ?? null;
        this.$root.dispatchEvent(
          new CustomEvent("nq-log-filter", {
            detail: { levels: LOG_LEVELS.filter((l) => this.levels.includes(l)), query: this.query, regex: this.regex, range, since: rangeSince(range ?? undefined) },
            bubbles: true,
          }),
        );
      });
    },
    write(this: LogViewerState, incoming: LogEntry | LogEntry[], replace = false, prepend = false) {
      const next = Array.isArray(incoming) ? incoming : [incoming];
      if (prepend) {
        const list = this.$refs.list;
        if (list && !this.anchor) this.anchor = { height: list.scrollHeight, top: list.scrollTop };
        this.following = false;
        this.loadingOlder = false;
      }
      this.entries = replace ? [...next] : prepend ? [...next, ...this.entries] : [...this.entries, ...next];
      this.refilter();
    },
    loadOlder(this: LogViewerState) {
      if (this.loadingOlder) return;
      const list = this.$refs.list;
      if (list) this.anchor = { height: list.scrollHeight, top: list.scrollTop };
      this.following = false;
      this.loadingOlder = true;
      this.$root.dispatchEvent(new CustomEvent("nq-log-older", { bubbles: true }));
    },
    setLive(this: LogViewerState, live: boolean) {
      this.paused = !live;
      this.pausedId = live ? null : this.entries.length ? (this.entries[this.entries.length - 1] as LogEntry).id : null;
      this.refilter();
      if (live) this.setFollowing(true);
      this.$root.dispatchEvent(new CustomEvent("nq-log-live", { detail: { live }, bubbles: true }));
    },
    pin(this: LogViewerState) {
      const list = this.$refs.list;
      if (list && this.following) {
        list.scrollTop = list.scrollHeight;
        this.scrollTop = list.scrollTop;
      }
    },
    measure(this: LogViewerState) {
      const list = this.$refs.list;
      if (list && this.viewport !== list.clientHeight) {
        this.viewport = list.clientHeight;
        this.scrollTop = list.scrollTop;
      }
    },
    onScroll(this: LogViewerState) {
      const list = this.$refs.list;
      if (!list) return;
      this.following = list.scrollHeight - list.scrollTop - list.clientHeight <= 24;
      this.scrollTop = list.scrollTop;
      this.viewport = list.clientHeight;
    },
    setFollowing(this: LogViewerState, on: boolean) {
      this.following = on;
      if (on) this.pin();
    },
    isOn(this: LogViewerState, level: LogLevel) {
      return this.levels.includes(level);
    },
    toggleLevel(this: LogViewerState, level: LogLevel) {
      this.levels = this.levels.includes(level) ? this.levels.filter((l) => l !== level) : LOG_LEVELS.filter((l) => l === level || this.levels.includes(l));
    },
    levelCount(this: LogViewerState, level: LogLevel) {
      return this.counts[level] ?? 0;
    },
    reset(this: LogViewerState) {
      this.levels = [...LOG_LEVELS];
      this.query = "";
      this.regex = false;
      if (this.ranges.length) this.rangeId = (this.ranges.find((r) => r.ms === null) ?? (this.ranges[this.ranges.length - 1] as LogRange)).id;
    },
    select(this: LogViewerState, id: LogEntry["id"] | null) {
      this.selected = id;
      this.current = id === null ? null : (this.rows.find((r) => r.id === id) ?? null);
    },
    toggleRow(this: LogViewerState, id: LogEntry["id"]) {
      this.select(this.selected === id ? null : id);
    },
    reveal(this: LogViewerState, index: number) {
      const list = this.$refs.list;
      if (!list) return;
      const top = this.head + index * this.rowHeight;
      if (top < list.scrollTop) list.scrollTop = index === 0 ? 0 : top;
      else if (top + this.rowHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + this.rowHeight - list.clientHeight;
      this.scrollTop = list.scrollTop;
    },
    onKey(this: LogViewerState, e: KeyboardEvent) {
      if (!this.rows.length) return;
      const page = Math.max(1, Math.floor(this.viewport / this.rowHeight) - 1);
      const at = this.selected === null ? -1 : this.rows.findIndex((r) => r.id === this.selected);
      const move: Record<string, number> = {
        ArrowDown: at + 1,
        ArrowUp: at < 0 ? this.rows.length - 1 : at - 1,
        PageDown: at + page,
        PageUp: at - page,
        Home: 0,
        End: this.rows.length - 1,
      };
      if (e.key === "Escape") {
        this.select(null);
        return;
      }
      if (!(e.key in move)) return;
      e.preventDefault();
      const next = Math.min(this.rows.length - 1, Math.max(0, move[e.key] as number));
      this.select((this.rows[next] as LogEntry).id);
      this.reveal(next);
    },
    time(this: LogViewerState, entry: LogEntry) {
      return formatLogTime(entry.time, { utc: this.utc });
    },
    currentTime(this: LogViewerState) {
      return this.current ? formatLogTime(this.current.time, { date: true, utc: this.utc }) : "";
    },
    pieces(this: LogViewerState, entry: LogEntry) {
      const m = compileMatcher(this.query, this.regex);
      return splitByRanges(entry.message, m && m !== "invalid" ? m.ranges(entry.message) : []);
    },
    rowId(this: LogViewerState, entry: LogEntry) {
      return `${this.uid}-${entry.id}`;
    },
    rowClass(this: LogViewerState, entry: LogEntry) {
      return `flex cursor-default items-center gap-3 whitespace-pre px-3 hover:bg-nq-hover ${LEVEL_ROW[entry.level]} ${entry.id === this.selected ? "bg-nq-selected hover:bg-nq-selected" : ""}`;
    },
    tag(level: LogLevel) {
      return LEVEL_TAG[level];
    },
    levelClass(level: LogLevel) {
      return LEVEL_TEXT[level];
    },
    chipClass(this: LogViewerState, level: LogLevel) {
      return this.levels.includes(level) ? "border-border bg-card text-foreground" : "border-transparent text-muted-foreground line-through hover:bg-nq-hover";
    },
    rowTitle(entry: LogEntry) {
      const text = entryText(entry);
      return text.length > 200 ? null : text;
    },
    doFlash(this: LogViewerState, message: string) {
      this.flash = message;
      if (this.flashTimer) clearTimeout(this.flashTimer);
      this.flashTimer = setTimeout(() => (this.flash = ""), 1500);
    },
    async copyVisible(this: LogViewerState) {
      const text = logsToText(this.rows, { utc: this.utc });
      if (await copyText(text)) {
        this.doFlash(this.strings.copied ?? "");
        this.$dispatch("nq-log-copy", { text });
      }
    },
    async copyEntry(this: LogViewerState) {
      const e = this.current;
      if (!e) return;
      const text = `${logsToText([e], { utc: this.utc })}${e.fields ? `\n${fieldsToText(e.fields)}` : ""}`;
      if (await copyText(text)) this.doFlash(this.strings.entryCopied ?? "");
    },
    download(this: LogViewerState) {
      const event = new CustomEvent("nq-log-download", { detail: { entries: this.rows }, bubbles: true, cancelable: true });
      if (!this.$root.dispatchEvent(event)) return;
      const blob = new Blob([`${logsToText(this.rows, { utc: this.utc })}\n`], { type: "text/plain;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = this.downloadFilename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 0);
    },
  }));
};

