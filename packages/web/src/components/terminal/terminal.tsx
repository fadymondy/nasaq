"use client";

import { ArrowDownToLine, Check, Copy, Eraser, WrapText } from "lucide-react";
import { type ComponentProps, type CSSProperties, type FormEvent, type KeyboardEvent, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { copyText } from "../copy-button";
import { Spinner } from "../spinner";
import { useFollowScroll } from "./follow-scroll";
import { type AnsiSpan, parseAnsiRows, stripAnsi } from "./terminal-ansi";

export { type AnsiSpan, type AnsiStyle, ansi256, ansiColor, parseAnsi, parseAnsiRows, stripAnsi } from "./terminal-ansi";
export { useFollowScroll } from "./follow-scroll";

const STRINGS = {
  en: {
    title: "Terminal",
    output: "Terminal output",
    copy: "Copy output",
    copied: "Output copied to clipboard",
    copyFailed: "Could not copy",
    clear: "Clear",
    wrap: "Wrap lines",
    follow: "Follow output",
    jump: "Jump to latest",
    streaming: "Streaming",
    finished: "Finished",
    input: "Command",
    running: "Running",
    trimmed: (n: number) => (n === 1 ? "1 earlier line hidden" : `${n} earlier lines hidden`),
    empty: "No output yet",
    lines: (n: number) => (n === 1 ? "1 line" : `${n} lines`),
  },
  ar: {
    title: "الطرفية",
    output: "مخرجات الطرفية",
    copy: "نسخ المخرجات",
    copied: "تم نسخ المخرجات إلى الحافظة",
    copyFailed: "تعذر النسخ",
    clear: "مسح",
    wrap: "التفاف الأسطر",
    follow: "تتبّع المخرجات",
    jump: "الانتقال إلى الأحدث",
    streaming: "جارٍ البث",
    finished: "انتهى",
    input: "أمر",
    running: "قيد التنفيذ",
    trimmed: (n: number) => (n === 1 ? "أُخفي سطر سابق واحد" : `أُخفيت ${n} أسطر سابقة`),
    empty: "لا توجد مخرجات بعد",
    lines: (n: number) => (n === 1 ? "سطر واحد" : `${n} أسطر`),
  },
};

export type TerminalLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<TerminalLabels>): TerminalLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

export type TerminalLineKind = "command" | "output" | "error" | "info" | "success";

export interface TerminalLineData {
  /** `command` shows the prompt before the text. Default `output`. */
  kind?: TerminalLineKind;
  /** The text. May contain ANSI colour codes and `\n`; each line becomes a row. */
  text: string;
  /** Stable key. Default: the position in the list. */
  id?: string | number;
}

/** A plain string is an `output` line. */
export type TerminalLine = string | TerminalLineData;

const KIND_CLASS: Record<TerminalLineKind, string> = {
  command: "text-foreground",
  output: "text-nq-fg-body",
  error: "text-nq-danger-text",
  info: "text-nq-info-text",
  success: "text-nq-success-text",
};

interface Row {
  key: string;
  kind: TerminalLineKind;
  spans: AnsiSpan[];
  /** First row of a command line: shows the prompt. */
  prompt: boolean;
}

function spanStyle(s: AnsiSpan["style"]): CSSProperties | undefined {
  const fg = s.inverse ? (s.bg ?? "var(--nq-surface-soft)") : s.fg;
  const bg = s.inverse ? (s.fg ?? "var(--nq-fg)") : s.bg;
  if (!fg && !bg && !s.dim) return undefined;
  return {
    ...(fg ? { color: fg } : {}),
    ...(bg ? { backgroundColor: bg } : {}),
    ...(s.dim ? { opacity: 0.65 } : {}),
  };
}

/** Renders text with ANSI colours as spans on one row. Use inside your own `<pre>`. */
export function AnsiText({ text, className }: { text: string; className?: string }) {
  const rows = useMemo(() => parseAnsiRows(text), [text]);
  return (
    <>
      {rows.map((spans, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and never reordered
        <span key={r} className={cn("block min-h-[1lh]", className)}>
          <SpanRow spans={spans} />
        </span>
      ))}
    </>
  );
}

function SpanRow({ spans }: { spans: AnsiSpan[] }) {
  return (
    <>
      {spans.map((s, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: spans are positional and never reordered
          key={i}
          style={spanStyle(s.style)}
          className={cn(s.style.bold && "font-bold", s.style.italic && "italic", (s.style.underline || s.style.strike) && "underline", s.style.strike && "line-through")}
        >
          {s.text}
        </span>
      ))}
    </>
  );
}

export interface TerminalProps extends Omit<ComponentProps<"div">, "children" | "dir" | "title"> {
  /** What was printed, oldest first. Append to stream. */
  lines: readonly TerminalLine[];
  /** Header text, e.g. `~/app`. Default "Terminal". */
  title?: string;
  /** The prompt shown before command lines and the input. Default `$`. */
  prompt?: string;
  /** The process is still running: shows a live indicator and a blinking cursor. */
  streaming?: boolean;
  /** Keep the view pinned to the newest line while output arrives. Default true. */
  follow?: boolean;
  /** Keep at most this many rows in the DOM; older ones are dropped with a note. Default 2000. */
  maxLines?: number;
  lineNumbers?: boolean;
  /** Wrap long lines instead of scrolling sideways. Default false. */
  wrap?: boolean;
  /** Show the copy button. Default true. */
  copyable?: boolean;
  /** Show a clear button that calls this. */
  onClear?: () => void;
  /** Adds an input line. Called with the typed command; the input stays disabled until it resolves. Up and down arrows walk history. */
  onCommand?: (command: string) => Promise<void> | void;
  /** Height of the output area, as a CSS value or Tailwind class through `className`. Default 20rem. */
  height?: string | number;
  labels?: Partial<TerminalLabels>;
}

/**
 * Terminal-style output: prompt lines, ANSI colours mapped to tokens, streaming with a follow mode, copy,
 * and an optional command input. Output is capped at `maxLines` so long-running processes stay fast.
 * Always left-to-right, also in Arabic pages; only the chrome is translated.
 */
export function Terminal({
  lines,
  title,
  prompt = "$",
  streaming = false,
  follow = true,
  maxLines = 2000,
  lineNumbers = false,
  wrap: wrapProp = false,
  copyable = true,
  onClear,
  onCommand,
  height = "20rem",
  labels,
  className,
  ...props
}: TerminalProps) {
  const t = useLabels(labels);
  const [wrap, setWrap] = useState(wrapProp);
  const [copied, setCopied] = useState(false);

  const all = useMemo(() => {
    const out: Row[] = [];
    lines.forEach((line, i) => {
      const data: TerminalLineData = typeof line === "string" ? { text: line } : line;
      const kind = data.kind ?? "output";
      parseAnsiRows(data.text).forEach((spans, r) => {
        out.push({ key: `${data.id ?? i}:${r}`, kind, spans, prompt: kind === "command" && r === 0 });
      });
    });
    return out;
  }, [lines]);
  const hidden = Math.max(0, all.length - maxLines);
  const rows = hidden ? all.slice(hidden) : all;
  const gutter = String(all.length).length;

  const { ref, following, setFollowing, onScroll } = useFollowScroll<HTMLDivElement>(rows.length + (streaming ? 1 : 0), follow);

  const plain = () =>
    lines
      .map((l) => stripAnsi(typeof l === "string" ? l : l.kind === "command" ? `${prompt} ${l.text}` : l.text))
      .join("\n");
  const copy = async () => {
    const ok = await copyText(plain());
    setCopied(ok);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      data-slot="terminal"
      data-streaming={streaming || undefined}
      dir="ltr"
      className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start", className)}
      {...props}
    >
      <div data-slot="terminal-header" className="flex h-row shrink-0 items-center justify-between gap-2 border-b border-border ps-3 pe-1.5">
        <span className="flex min-w-0 items-center gap-2 font-mono text-caption text-muted-foreground">
          <span className="truncate">{title ?? t.title}</span>
          {streaming ? (
            <span className="inline-flex shrink-0 items-center gap-1 font-sans text-nq-success-text">
              <Spinner className="size-3" />
              {t.streaming}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.wrap}
            aria-pressed={wrap}
            data-active={wrap || undefined}
            className="data-active:bg-nq-selected"
            onClick={() => setWrap((w) => !w)}
          >
            <WrapText aria-hidden />
          </Button>
          {onClear ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t.clear} onClick={onClear}>
              <Eraser aria-hidden />
            </Button>
          ) : null}
          {copyable ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.copy}
              data-copied={copied || undefined}
              className="data-copied:text-nq-success-text"
              onClick={copy}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            </Button>
          ) : null}
        </span>
      </div>

      <div
        ref={ref}
        data-slot="terminal-output"
        role="log"
        aria-label={t.output}
        aria-live="off"
        tabIndex={0}
        onScroll={onScroll}
        style={{ height }}
        className="min-h-0 overflow-auto py-2 font-mono text-code outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
      >
        <div className={cn("min-w-full", wrap ? "w-full" : "w-max")}>
          {hidden ? <p className="px-3 pb-1 text-caption text-muted-foreground">{t.trimmed(hidden)}</p> : null}
          {rows.length === 0 && !streaming ? <p className="px-3 text-muted-foreground">{t.empty}</p> : null}
          {rows.map((row, i) => (
            <div
              key={row.key}
              data-kind={row.kind}
              className={cn("flex min-h-[1lh] px-3", KIND_CLASS[row.kind], wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre")}
            >
              {lineNumbers ? (
                <span aria-hidden="true" className="me-3 inline-block shrink-0 select-none text-end text-muted-foreground tabular-nums" style={{ minWidth: `${gutter}ch` }}>
                  {hidden + i + 1}
                </span>
              ) : null}
              {row.prompt ? (
                <span aria-hidden="true" className="me-2 shrink-0 select-none text-nq-accent-text">
                  {prompt}
                </span>
              ) : null}
              <span className="min-w-0">
                <SpanRow spans={row.spans} />
              </span>
            </div>
          ))}
          {streaming ? (
            <div className="flex min-h-[1lh] px-3" aria-hidden="true">
              <span className="inline-block h-[1lh] w-[0.6em] bg-nq-fg motion-safe:animate-pulse" />
            </div>
          ) : null}
        </div>
      </div>

      {!following && (streaming || rows.length > 0) ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="absolute end-3 bottom-3 shadow-sm"
          style={onCommand ? { bottom: "3.25rem" } : undefined}
          onClick={() => setFollowing(true)}
        >
          <ArrowDownToLine aria-hidden />
          {t.jump}
        </Button>
      ) : null}

      {onCommand ? <CommandInput prompt={prompt} onCommand={onCommand} label={t.input} runningLabel={t.running} /> : null}

      <span role="status" aria-live="polite" className="sr-only">
        {copied ? t.copied : ""}
      </span>
    </div>
  );
}

function CommandInput({
  prompt,
  onCommand,
  label,
  runningLabel,
}: {
  prompt: string;
  onCommand: (command: string) => Promise<void> | void;
  label: string;
  runningLabel: string;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);
  const input = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const command = value.trim();
    if (!command || busy) return;
    history.current = [command, ...history.current].slice(0, 50);
    cursor.current = -1;
    setValue("");
    setBusy(true);
    try {
      await onCommand(command);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const next = Math.min(history.current.length - 1, Math.max(-1, cursor.current + (e.key === "ArrowUp" ? 1 : -1)));
    cursor.current = next;
    setValue(next === -1 ? "" : (history.current[next] ?? ""));
  };

  return (
    <form data-slot="terminal-input" onSubmit={submit} className="flex h-control shrink-0 items-center gap-2 border-t border-border px-3 font-mono text-code">
      <span aria-hidden="true" className="select-none text-nq-accent-text">
        {prompt}
      </span>
      <input
        ref={input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy}
        aria-label={label}
        placeholder={busy ? runningLabel : undefined}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
      />
    </form>
  );
}
