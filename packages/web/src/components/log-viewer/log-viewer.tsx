"use client";

import { ArrowDownToLine, Check, Clock, Copy, Download, History, Pause, Play, Regex, Search, X } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { copyText } from "../copy-button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { NativeSelect } from "../native-select";
import { Spinner } from "../spinner";
import { EmptyState } from "../states";
import { useFollowScroll } from "../terminal/follow-scroll";
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
} from "./log-viewer-format";

export {
  compileMatcher,
  countByLevel,
  entriesUntil,
  entryText,
  filterLogs,
  formatLogTime,
  LOG_LEVELS,
  LOG_RANGES,
  type LogEntry,
  type LogFilter,
  type LogLevel,
  type LogRange,
  type LogTimeOptions,
  logsToText,
  normalizeLevel,
  rangeSince,
  virtualWindow,
} from "./log-viewer-format";

const STRINGS = {
  en: {
    title: "Logs",
    list: "Log entries",
    search: "Search logs",
    searchPlaceholder: "Search logs",
    regex: "Use regular expression",
    invalidRegex: "Invalid regular expression",
    levels: "Filter by level",
    level: { trace: "Trace", debug: "Debug", info: "Info", warn: "Warn", error: "Error", fatal: "Fatal" } as Record<LogLevel, string>,
    timestamps: "Show timestamps",
    follow: "Follow new logs",
    jump: "Jump to latest",
    streaming: "Live",
    copy: "Copy visible logs",
    copied: "Logs copied to clipboard",
    download: "Download logs",
    count: (shown: number, total: number) => (shown === total ? `${total} entries` : `${shown} of ${total} entries`),
    emptyTitle: "No logs yet",
    emptyBody: "New entries show up here as they arrive.",
    noMatchTitle: "No entries match",
    noMatchBody: "Try a different search or turn on more levels.",
    resetFilters: "Reset filters",
    detail: "Entry details",
    closeDetail: "Close details",
    copyEntry: "Copy entry",
    entryCopied: "Entry copied to clipboard",
    time: "Time",
    source: "Source",
    message: "Message",
    fields: "Fields",
    range: "Time range",
    loadOlder: "Load older entries",
    loadingOlder: "Loading older entries…",
    pause: "Pause live tail",
    resume: "Resume live tail",
    paused: "Paused",
    newWhilePaused: (n: number) => (n === 1 ? "1 new entry" : `${n} new entries`),
  },
  ar: {
    title: "السجلات",
    list: "مدخلات السجل",
    search: "بحث في السجلات",
    searchPlaceholder: "ابحث في السجلات",
    regex: "استخدام تعبير نمطي",
    invalidRegex: "تعبير نمطي غير صالح",
    levels: "تصفية حسب المستوى",
    level: { trace: "تتبّع", debug: "تصحيح", info: "معلومات", warn: "تحذير", error: "خطأ", fatal: "حرج" } as Record<LogLevel, string>,
    timestamps: "إظهار الطوابع الزمنية",
    follow: "تتبّع السجلات الجديدة",
    jump: "الانتقال إلى الأحدث",
    streaming: "مباشر",
    copy: "نسخ السجلات الظاهرة",
    copied: "تم نسخ السجلات إلى الحافظة",
    download: "تنزيل السجلات",
    count: (shown: number, total: number) => (shown === total ? `${total} مدخلات` : `${shown} من ${total} مدخلات`),
    emptyTitle: "لا توجد سجلات بعد",
    emptyBody: "تظهر المدخلات الجديدة هنا فور وصولها.",
    noMatchTitle: "لا توجد مدخلات مطابقة",
    noMatchBody: "جرّب بحثًا آخر أو فعّل مستويات أكثر.",
    resetFilters: "إعادة ضبط المرشحات",
    detail: "تفاصيل المدخل",
    closeDetail: "إغلاق التفاصيل",
    copyEntry: "نسخ المدخل",
    entryCopied: "تم نسخ المدخل إلى الحافظة",
    time: "الوقت",
    source: "المصدر",
    message: "الرسالة",
    fields: "الحقول",
    range: "النطاق الزمني",
    loadOlder: "تحميل مدخلات أقدم",
    loadingOlder: "جارٍ تحميل مدخلات أقدم…",
    pause: "إيقاف التتبّع المباشر مؤقتًا",
    resume: "استئناف التتبّع المباشر",
    paused: "متوقف مؤقتًا",
    newWhilePaused: (n: number) => (n === 1 ? "مدخل جديد واحد" : `${n} مدخلات جديدة`),
  },
};

export type LogViewerLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<LogViewerLabels>): LogViewerLabels & { ar: boolean } {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels, ar };
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
const LEVEL_TAG: Record<LogLevel, string> = { trace: "TRACE", debug: "DEBUG", info: "INFO", warn: "WARN", error: "ERROR", fatal: "FATAL" };

/** Height of the "Load older" bar at the top of the list, in pixels. */
const OLDER_BAR = 36;

function Highlight({ text, ranges }: { text: string; ranges: [number, number][] }) {
  if (!ranges.length) return <>{text}</>;
  return (
    <>
      {splitByRanges(text, ranges).map((part, i) =>
        part.match ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: pieces are positional
          <mark key={i} className="rounded-[2px] bg-nq-accent/30 text-inherit">
            {part.text}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: pieces are positional
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** What the reader is asking for, for a server that does the filtering (`manual`). */
export interface LogViewerFilter {
  levels: LogLevel[];
  query: string;
  regex: boolean;
  /** The chosen time range, if the viewer has `ranges`. */
  range: LogRange | null;
  /** Keep entries at or after this time (epoch milliseconds), from the range. `null`: no limit. */
  since: number | null;
}

export interface LogViewerProps extends Omit<ComponentProps<"div">, "children" | "dir" | "title"> {
  /** Entries, oldest first. Append to stream; the list is virtualised so tens of thousands are fine. */
  entries: readonly LogEntry[];
  /** Header text. Default "Logs". */
  title?: string;
  /** More entries are still arriving: shows a live indicator. */
  streaming?: boolean;
  /** Start pinned to the newest entry. Default true. */
  follow?: boolean;
  /** Levels switched on at the start. Default all. */
  defaultLevels?: readonly LogLevel[];
  /** Initial search text. */
  defaultQuery?: string;
  /** Show timestamps. Default true. */
  timestamps?: boolean;
  /** Timestamps in UTC instead of local time. */
  utc?: boolean;
  /** Row height in pixels. Rows are single-line; open one for the full text. Default 24. */
  rowHeight?: number;
  /** Height of the list area. Default 24rem. */
  height?: string | number;
  /** Extra controls in the toolbar, e.g. a source select. */
  toolbar?: ReactNode;
  /** Called when the user asks to download. Default: saves the visible entries as a `.log` file. */
  onDownload?: (entries: readonly LogEntry[]) => void;
  /** File name for the default download. Default "logs.log". */
  downloadFilename?: string;
  /**
   * The server filters. `entries` are shown as given (search matches are still highlighted) and every change of
   * level, search, regex or range is reported through `onFilterChange`.
   */
  manual?: boolean;
  /** Called after the reader changes a filter (search is deferred while typing). Not called on mount. */
  onFilterChange?: (filter: LogViewerFilter) => void;
  /** Per-level totals for the chips, e.g. from the server. Default: counted from `entries`. */
  counts?: Partial<Record<LogLevel, number>>;
  /** How many entries match on the server, for the footer. Default: `entries.length`. */
  total?: number;
  /** Time windows to choose from, e.g. `LOG_RANGES`. Adds a range select. */
  ranges?: readonly LogRange[];
  /** Id of the range chosen at the start. Default: the last range. */
  defaultRange?: string;
  /** Older entries exist: shows "Load older entries" at the top of the list. */
  hasOlder?: boolean;
  /** Fetch older entries and prepend them; the list keeps its place. */
  onLoadOlder?: () => void | Promise<void>;
  /** Older entries are loading. Defaults to tracking the promise from `onLoadOlder`. */
  loadingOlder?: boolean;
  /**
   * Adds a pause button. Paused, the list holds still while new entries keep arriving, and the footer counts them;
   * resume to catch up. Reported with `onLiveChange`, e.g. to close a socket.
   */
  liveTail?: boolean;
  onLiveChange?: (live: boolean) => void;
  labels?: Partial<LogViewerLabels>;
}

/**
 * A log stream that behaves like a dev tool: level filters with counts, search with highlights (optionally
 * a regular expression), a time range, follow-the-tail with a jump button, pause and resume, loading older
 * entries, timestamps, keyboard navigation and a detail panel. Filtering runs here, or on the server with
 * `manual`. The list is windowed with fixed-height rows, so long streams stay smooth. Always left-to-right.
 */
export function LogViewer({
  entries,
  title,
  streaming = false,
  follow = true,
  defaultLevels,
  defaultQuery = "",
  timestamps: timestampsProp = true,
  utc = false,
  rowHeight = 24,
  height = "24rem",
  toolbar,
  onDownload,
  downloadFilename = "logs.log",
  manual = false,
  onFilterChange,
  counts: countsProp,
  total,
  ranges,
  defaultRange,
  hasOlder = false,
  onLoadOlder,
  loadingOlder: loadingOlderProp,
  liveTail = false,
  onLiveChange,
  labels,
  className,
  ...props
}: LogViewerProps) {
  const t = useLabels(labels);
  const uid = useId();
  const [levels, setLevels] = useState<ReadonlySet<LogLevel>>(() => new Set(defaultLevels ?? LOG_LEVELS));
  const [query, setQuery] = useState(defaultQuery);
  const [regex, setRegex] = useState(false);
  const [rangeId, setRangeId] = useState(() => defaultRange ?? ranges?.[ranges.length - 1]?.id ?? "");
  const [showTime, setShowTime] = useState(timestampsProp);
  const [selected, setSelected] = useState<LogEntry["id"] | null>(null);
  const [copied, setCopied] = useState("");
  const [pausedAt, setPausedAt] = useState<{ id: LogEntry["id"] | null } | null>(null);
  const [ownLoading, setOwnLoading] = useState(false);
  const loadingOlder = loadingOlderProp ?? ownLoading;
  const deferred = useDeferredValue(query);
  const range = ranges?.find((r) => r.id === rangeId) ?? null;

  // Paused, the list stops at the last entry it had; later entries wait and are counted.
  const shown = useMemo(() => (pausedAt ? entriesUntil(entries, pausedAt.id) : entries), [entries, pausedAt]);
  const waiting = pausedAt ? entries.length - shown.length : 0;

  const counts = useMemo(() => ({ ...countByLevel(shown), ...countsProp }), [shown, countsProp]);
  const { entries: rows, invalid } = useMemo(() => {
    if (manual) return { entries: shown as LogEntry[], invalid: compileMatcher(deferred, regex) === "invalid" };
    return filterLogs(shown, { levels, query: deferred, regex, since: rangeSince(range ?? undefined) });
  }, [manual, shown, levels, deferred, regex, range]);
  const matcher = useMemo(() => {
    const m = compileMatcher(deferred, regex);
    return m === "invalid" ? null : m;
  }, [deferred, regex]);
  const filtering = levels.size < LOG_LEVELS.length || query !== "" || (!!range && range.ms !== null);

  // Report filter changes to a server, but not the initial state.
  const report = useRef(onFilterChange);
  report.current = onFilterChange;
  const levelKey = LOG_LEVELS.filter((l) => levels.has(l)).join(",");
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    report.current?.({
      levels: LOG_LEVELS.filter((l) => levelKey.split(",").includes(l)),
      query: deferred,
      regex,
      range,
      since: rangeSince(range ?? undefined),
    });
    // range is identified by rangeId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKey, deferred, regex, rangeId]);

  const { ref, following, setFollowing, onScroll: onFollowScroll } = useFollowScroll<HTMLDivElement>(rows.length, follow && !pausedAt);
  const [scroll, setScroll] = useState({ top: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScroll((s) => (s.height === el.clientHeight ? s : { top: el.scrollTop, height: el.clientHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  const onScroll = useCallback(() => {
    onFollowScroll();
    const el = ref.current;
    if (el) setScroll({ top: el.scrollTop, height: el.clientHeight });
  }, [onFollowScroll, ref]);

  // Keep the reader's place when older entries are prepended.
  const head = hasOlder || loadingOlder ? OLDER_BAR : 0;
  const anchor = useRef<{ height: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const a = anchor.current;
    if (!el || !a || el.scrollHeight === a.height) return;
    el.scrollTop = a.top + (el.scrollHeight - a.height);
    anchor.current = null;
  }, [rows.length, head, ref]);
  const loadOlder = async () => {
    if (!onLoadOlder || loadingOlder) return;
    const el = ref.current;
    if (el) anchor.current = { height: el.scrollHeight, top: el.scrollTop };
    setFollowing(false);
    setOwnLoading(true);
    try {
      await onLoadOlder();
    } finally {
      setOwnLoading(false);
    }
  };

  const { start, end } = virtualWindow({ scrollTop: Math.max(0, scroll.top - head), viewport: scroll.height, rowHeight, count: rows.length });
  const selectedIndex = selected === null ? -1 : rows.findIndex((r) => r.id === selected);
  const selectedEntry = selectedIndex >= 0 ? rows[selectedIndex] : undefined;

  const reveal = (index: number) => {
    const el = ref.current;
    if (!el) return;
    const top = head + index * rowHeight;
    if (top < el.scrollTop) el.scrollTop = index === 0 ? 0 : top;
    else if (top + rowHeight > el.scrollTop + el.clientHeight) el.scrollTop = top + rowHeight - el.clientHeight;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!rows.length) return;
    const page = Math.max(1, Math.floor(scroll.height / rowHeight) - 1);
    const move: Record<string, number> = {
      ArrowDown: selectedIndex + 1,
      ArrowUp: selectedIndex < 0 ? rows.length - 1 : selectedIndex - 1,
      PageDown: selectedIndex + page,
      PageUp: selectedIndex - page,
      Home: 0,
      End: rows.length - 1,
    };
    if (e.key === "Escape") {
      setSelected(null);
      return;
    }
    if (!(e.key in move)) return;
    e.preventDefault();
    const next = Math.min(rows.length - 1, Math.max(0, move[e.key] as number));
    setSelected((rows[next] as LogEntry).id);
    reveal(next);
  };

  const flash = (message: string) => {
    setCopied(message);
    setTimeout(() => setCopied(""), 1500);
  };
  const timeOptions = { utc };
  const download = () => {
    if (onDownload) return onDownload(rows);
    const blob = new Blob([`${logsToText(rows, timeOptions)}\n`], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = downloadFilename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
  };
  const toggleLevel = (level: LogLevel) =>
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  const reset = () => {
    setLevels(new Set(LOG_LEVELS));
    setQuery("");
    setRegex(false);
    if (ranges?.length) setRangeId(ranges.find((r) => r.ms === null)?.id ?? ranges[ranges.length - 1]!.id);
  };
  const setLive = (live: boolean) => {
    setPausedAt(live ? null : { id: entries.length ? entries[entries.length - 1]!.id : null });
    if (live) setFollowing(true);
    onLiveChange?.(live);
  };

  const olderBar =
    hasOlder || loadingOlder ? (
      <div data-slot="log-viewer-older" className="flex items-center justify-center border-b border-border/60" style={{ height: OLDER_BAR }}>
        {loadingOlder ? (
          <span role="status" className="inline-flex items-center gap-2 font-sans text-caption text-muted-foreground">
            <Spinner className="size-3" />
            {t.loadingOlder}
          </span>
        ) : onLoadOlder ? (
          <Button type="button" size="sm" variant="ghost" onClick={loadOlder}>
            <History aria-hidden />
            {t.loadOlder}
          </Button>
        ) : null}
      </div>
    ) : null;

  return (
    <div
      data-slot="log-viewer"
      data-streaming={streaming || undefined}
      data-paused={pausedAt ? "" : undefined}
      dir="ltr"
      className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start", className)}
      {...props}
    >
      <div data-slot="log-viewer-toolbar" className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <InputGroup className="min-w-40 flex-1 basis-56">
          <InputGroupAddon align="start">
            <Search aria-hidden className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            ltr
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.search}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${uid}-invalid` : undefined}
            className="font-mono text-code"
          />
          <InputGroupAddon align="end">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.regex}
              aria-pressed={regex}
              data-active={regex || undefined}
              className="data-active:bg-nq-selected"
              onClick={() => setRegex((r) => !r)}
            >
              <Regex aria-hidden />
            </Button>
          </InputGroupAddon>
        </InputGroup>
        {ranges?.length ? (
          <NativeSelect
            size="sm"
            aria-label={t.range}
            data-slot="log-viewer-range"
            value={rangeId}
            onChange={(e) => setRangeId(e.currentTarget.value)}
            options={ranges.map((r) => ({ value: r.id, label: (t.ar && r.labelAr) || r.label }))}
            className="w-auto"
          />
        ) : null}
        <div role="group" aria-label={t.levels} className="flex flex-wrap items-center gap-1">
          {LOG_LEVELS.map((level) => {
            const on = levels.has(level);
            return (
              <button
                key={level}
                type="button"
                aria-pressed={on}
                data-level={level}
                onClick={() => toggleLevel(level)}
                className={cn(
                  "inline-flex h-control-sm items-center gap-1.5 rounded-control border px-2 text-caption outline-none transition-colors duration-150 ease-nq",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                  on ? "border-border bg-card text-foreground" : "border-transparent text-muted-foreground line-through hover:bg-nq-hover",
                )}
              >
                <span className={cn("font-mono", on && LEVEL_TEXT[level])}>{t.level[level]}</span>
                <span className="tabular-nums text-muted-foreground">{counts[level] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div className="ms-auto flex items-center gap-0.5">
          {toolbar}
          {liveTail ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={pausedAt ? t.resume : t.pause}
              aria-pressed={!!pausedAt}
              data-slot="log-viewer-live"
              data-active={pausedAt ? true : undefined}
              className="data-active:bg-nq-selected"
              onClick={() => setLive(!!pausedAt)}
            >
              {pausedAt ? <Play aria-hidden /> : <Pause aria-hidden />}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.timestamps}
            aria-pressed={showTime}
            data-active={showTime || undefined}
            className="data-active:bg-nq-selected"
            onClick={() => setShowTime((s) => !s)}
          >
            <Clock aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.follow}
            aria-pressed={following}
            data-active={following || undefined}
            className="data-active:bg-nq-selected"
            onClick={() => setFollowing(!following)}
          >
            <ArrowDownToLine aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.copy}
            data-copied={copied === t.copied || undefined}
            className="data-copied:text-nq-success-text"
            onClick={async () => {
              if (await copyText(logsToText(rows, timeOptions))) flash(t.copied);
            }}
          >
            {copied === t.copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.download} onClick={download}>
            <Download aria-hidden />
          </Button>
        </div>
      </div>
      {invalid ? (
        <p id={`${uid}-invalid`} className="border-b border-border px-3 py-1 text-caption text-nq-danger-text">
          {t.invalidRegex}
        </p>
      ) : null}

      <div className="relative">
        <div
          ref={ref}
          data-slot="log-viewer-list"
          role="log"
          aria-label={title ?? t.list}
          aria-live="off"
          aria-activedescendant={selectedEntry ? `${uid}-${selectedEntry.id}` : undefined}
          tabIndex={0}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          style={{ height }}
          className="overflow-auto font-mono text-code outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
        >
          {rows.length === 0 ? (
            <>
              {olderBar}
              <EmptyState
                className="m-3 border-0"
                title={entries.length === 0 ? t.emptyTitle : t.noMatchTitle}
                description={entries.length === 0 ? t.emptyBody : t.noMatchBody}
                actions={
                  entries.length > 0 && filtering ? (
                    <Button type="button" size="sm" onClick={reset}>
                      <X aria-hidden />
                      {t.resetFilters}
                    </Button>
                  ) : undefined
                }
              />
            </>
          ) : (
            <div style={{ height: head + rows.length * rowHeight }} className="relative min-w-full w-max">
              {olderBar ? <div className="absolute inset-x-0 top-0">{olderBar}</div> : null}
              {rows.slice(start, end).map((entry, i) => {
                const index = start + i;
                const text = entryText(entry);
                const ranges = matcher ? matcher.ranges(entry.message) : [];
                const on = entry.id === selected;
                return (
                  <div
                    key={entry.id}
                    id={`${uid}-${entry.id}`}
                    role="listitem"
                    aria-posinset={index + 1}
                    aria-setsize={rows.length}
                    aria-current={on || undefined}
                    data-level={entry.level}
                    data-selected={on || undefined}
                    title={text.length > 200 ? undefined : text}
                    onClick={() => setSelected(on ? null : entry.id)}
                    style={{ position: "absolute", insetInlineStart: 0, insetInlineEnd: 0, top: head + index * rowHeight, height: rowHeight }}
                    className={cn(
                      "flex cursor-default items-center gap-3 whitespace-pre px-3 hover:bg-nq-hover",
                      LEVEL_ROW[entry.level],
                      on && "bg-nq-selected hover:bg-nq-selected",
                    )}
                  >
                    {showTime ? <span className="shrink-0 text-muted-foreground tabular-nums">{formatLogTime(entry.time, timeOptions)}</span> : null}
                    <span className={cn("w-[5ch] shrink-0", LEVEL_TEXT[entry.level])}>{LEVEL_TAG[entry.level]}</span>
                    {entry.source ? <span className="max-w-[16ch] shrink-0 truncate text-nq-info-text">{entry.source}</span> : null}
                    <span className="text-foreground">
                      <Highlight text={entry.message} ranges={ranges} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {pausedAt && waiting > 0 ? (
          <Button type="button" size="sm" variant="primary" className="absolute end-3 bottom-3 shadow-sm" onClick={() => setLive(true)}>
            <Play aria-hidden />
            {t.newWhilePaused(waiting)}
          </Button>
        ) : !following && rows.length > 0 && !pausedAt ? (
          <Button type="button" size="sm" variant="secondary" className="absolute end-3 bottom-3 shadow-sm" onClick={() => setFollowing(true)}>
            <ArrowDownToLine aria-hidden />
            {t.jump}
          </Button>
        ) : null}
      </div>

      {selectedEntry ? (
        <EntryDetail
          entry={selectedEntry}
          t={t}
          utc={utc}
          onClose={() => setSelected(null)}
          onCopied={() => flash(t.entryCopied)}
        />
      ) : null}

      <div data-slot="log-viewer-footer" className="flex h-8 items-center justify-between gap-2 border-t border-border px-3 text-caption text-muted-foreground">
        <span className="tabular-nums">{t.count(rows.length, total ?? shown.length)}</span>
        {pausedAt ? (
          <span role="status" className="inline-flex items-center gap-1 text-nq-warning-text">
            <Pause aria-hidden className="size-3" />
            {t.paused}
            {waiting > 0 ? <span className="tabular-nums text-muted-foreground"> · {t.newWhilePaused(waiting)}</span> : null}
          </span>
        ) : streaming ? (
          <span className="inline-flex items-center gap-1 text-nq-success-text">
            <Spinner className="size-3" />
            {t.streaming}
          </span>
        ) : null}
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {copied}
      </span>
    </div>
  );
}

function EntryDetail({
  entry,
  t,
  utc,
  onClose,
  onCopied,
}: {
  entry: LogEntry;
  t: LogViewerLabels;
  utc: boolean;
  onClose: () => void;
  onCopied: () => void;
}) {
  const text = `${logsToText([entry], { utc })}${entry.fields ? `\n${fieldsToText(entry.fields)}` : ""}`;
  return (
    <section data-slot="log-viewer-detail" aria-label={t.detail} className="max-h-48 shrink-0 overflow-auto border-t border-border bg-card p-3 font-mono text-code">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn("text-caption", LEVEL_TEXT[entry.level])}>
          {LEVEL_TAG[entry.level]} <span className="text-muted-foreground">{formatLogTime(entry.time, { date: true, utc })}</span>
          {entry.source ? <span className="text-nq-info-text"> {entry.source}</span> : null}
        </span>
        <span className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.copyEntry}
            onClick={async () => {
              if (await copyText(text)) onCopied();
            }}
          >
            <Copy aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.closeDetail} onClick={onClose}>
            <X aria-hidden />
          </Button>
        </span>
      </div>
      <p className="whitespace-pre-wrap break-all text-foreground">{entry.message}</p>
      {entry.fields && Object.keys(entry.fields).length ? (
        <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5">
          {Object.entries(entry.fields).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="m-0 break-all text-foreground">{typeof v === "string" ? v : JSON.stringify(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
