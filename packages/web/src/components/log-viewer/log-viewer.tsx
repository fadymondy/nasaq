"use client";

import { ArrowDownToLine, Check, Clock, Copy, Download, Regex, Search, X } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { copyText } from "../copy-button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Spinner } from "../spinner";
import { EmptyState } from "../states";
import { useFollowScroll } from "../terminal/follow-scroll";
import {
  compileMatcher,
  countByLevel,
  entryText,
  fieldsToText,
  filterLogs,
  formatLogTime,
  LOG_LEVELS,
  type LogEntry,
  type LogLevel,
  logsToText,
  splitByRanges,
  virtualWindow,
} from "./log-viewer-format";

export {
  compileMatcher,
  countByLevel,
  entryText,
  filterLogs,
  formatLogTime,
  LOG_LEVELS,
  type LogEntry,
  type LogLevel,
  type LogTimeOptions,
  logsToText,
  normalizeLevel,
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
  },
};

export type LogViewerLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<LogViewerLabels>): LogViewerLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
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
  labels?: Partial<LogViewerLabels>;
}

/**
 * A log stream that behaves like a dev tool: level filters with counts, search with highlights (optionally
 * a regular expression), follow-the-tail with a jump button, timestamps, keyboard navigation and a detail
 * panel. The list is windowed with fixed-height rows, so long streams stay smooth. Always left-to-right.
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
  labels,
  className,
  ...props
}: LogViewerProps) {
  const t = useLabels(labels);
  const uid = useId();
  const [levels, setLevels] = useState<ReadonlySet<LogLevel>>(() => new Set(defaultLevels ?? LOG_LEVELS));
  const [query, setQuery] = useState(defaultQuery);
  const [regex, setRegex] = useState(false);
  const [showTime, setShowTime] = useState(timestampsProp);
  const [selected, setSelected] = useState<LogEntry["id"] | null>(null);
  const [copied, setCopied] = useState("");
  const deferred = useDeferredValue(query);

  const counts = useMemo(() => countByLevel(entries), [entries]);
  const { entries: rows, invalid } = useMemo(() => filterLogs(entries, { levels, query: deferred, regex }), [entries, levels, deferred, regex]);
  const matcher = useMemo(() => {
    const m = compileMatcher(deferred, regex);
    return m === "invalid" ? null : m;
  }, [deferred, regex]);
  const filtering = levels.size < LOG_LEVELS.length || query !== "";

  const { ref, following, setFollowing, onScroll: onFollowScroll } = useFollowScroll<HTMLDivElement>(rows.length, follow);
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

  const { start, end } = virtualWindow({ scrollTop: scroll.top, viewport: scroll.height, rowHeight, count: rows.length });
  const selectedIndex = selected === null ? -1 : rows.findIndex((r) => r.id === selected);
  const selectedEntry = selectedIndex >= 0 ? rows[selectedIndex] : undefined;

  const reveal = (index: number) => {
    const el = ref.current;
    if (!el) return;
    const top = index * rowHeight;
    if (top < el.scrollTop) el.scrollTop = top;
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
  };

  return (
    <div
      data-slot="log-viewer"
      data-streaming={streaming || undefined}
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
                <span className="tabular-nums text-muted-foreground">{counts[level]}</span>
              </button>
            );
          })}
        </div>
        <div className="ms-auto flex items-center gap-0.5">
          {toolbar}
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
          ) : (
            <div style={{ height: rows.length * rowHeight }} className="relative min-w-full w-max">
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
                    style={{ position: "absolute", insetInlineStart: 0, insetInlineEnd: 0, top: index * rowHeight, height: rowHeight }}
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
        {!following && rows.length > 0 ? (
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
        <span className="tabular-nums">{t.count(rows.length, entries.length)}</span>
        {streaming ? (
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
