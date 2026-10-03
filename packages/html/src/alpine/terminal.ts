// nqTerminal: terminal-style output (prompt lines, ANSI colours mapped to tokens, streaming, follow-the-tail, copy, optional command
// input). The markup is the React Terminal's, rendered by <x-nq::terminal>. Always left-to-right; only the chrome is translated.
//
//   <div data-slot="terminal" dir="ltr" x-data="nqTerminal({ lines: [...], prompt: '$', streaming: true, maxLines: 2000, ... })"> ... </div>
//
// Lines: a string (an output line) or { kind?: 'command'|'output'|'error'|'info'|'success', text, id? }; text may hold ANSI codes and newlines.
// Append from anywhere with a bubbling-free event on the terminal element, or from Alpine:
//   el.dispatchEvent(new CustomEvent('nq-terminal-write', { detail: { lines: ['more output'] } }))     // append (replace: true swaps everything)
//   el.dispatchEvent(new CustomEvent('nq-terminal-state', { detail: { streaming: false } }))            // the process finished
// Events out (bubbling): nq-terminal-clear (the clear button also empties the lines), nq-terminal-command { command, wait(promise) }
// (the input stays busy until every promise settles), nq-terminal-copy { text }.
// The ANSI parser is a copy of packages/web/src/components/terminal/terminal-ansi.ts (./terminal-ansi.ts).

import { copyText } from "./copy-button";
import { type AnsiSpan, parseAnsiRows, stripAnsi } from "./terminal-ansi";
import type { Magics, Register } from "./types";

type Kind = "command" | "output" | "error" | "info" | "success";
type Line = string | { kind?: Kind; text: string; id?: string | number };
interface Row {
  key: string;
  kind: Kind;
  spans: AnsiSpan[];
  prompt: boolean;
}

interface Config {
  lines?: Line[];
  prompt?: string;
  streaming?: boolean;
  follow?: boolean;
  maxLines?: number;
  wrap?: boolean;
  strings?: Record<string, string>;
}

interface TerminalState extends Magics {
  lines: Line[];
  prompt: string;
  streaming: boolean;
  maxLines: number;
  wrap: boolean;
  following: boolean;
  copied: boolean;
  busy: boolean;
  command: string;
  all: Row[];
  history: string[];
  cursor: number;
  strings: Record<string, string>;
  copyTimer: ReturnType<typeof setTimeout> | undefined;
  readonly hidden: number;
  readonly rows: Row[];
  readonly gutter: number;
  readonly empty: boolean;
  readonly showJump: boolean;
  rebuild(): void;
  pin(): void;
  onScroll(): void;
  jump(): void;
  write(lines: Line | Line[], replace?: boolean): void;
  clear(): void;
  copy(): Promise<void>;
  submit(): Promise<void>;
  onKey(e: KeyboardEvent): void;
  trimmedText(): string;
  spanStyle(s: AnsiSpan["style"]): Record<string, string> | undefined;
  spanClass(s: AnsiSpan["style"]): string;
  rowClass(row: Row): string;
}

const KIND_CLASS: Record<Kind, string> = {
  command: "text-foreground",
  output: "text-nq-fg-body",
  error: "text-nq-danger-text",
  info: "text-nq-info-text",
  success: "text-nq-success-text",
};

export const terminal: Register = (Alpine) => {
  Alpine.data("nqTerminal", (cfg: Config = {}) => ({
    lines: [...(cfg.lines ?? [])] as Line[],
    prompt: cfg.prompt ?? "$",
    streaming: !!cfg.streaming,
    maxLines: cfg.maxLines ?? 2000,
    wrap: !!cfg.wrap,
    following: cfg.follow !== false,
    copied: false,
    busy: false,
    command: "",
    all: [] as Row[],
    history: [] as string[],
    cursor: -1,
    strings: cfg.strings ?? {},
    copyTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    get hidden() {
      const self = this as unknown as TerminalState;
      return Math.max(0, self.all.length - self.maxLines);
    },
    get rows() {
      const self = this as unknown as TerminalState;
      return self.hidden ? self.all.slice(self.hidden) : self.all;
    },
    get gutter() {
      const self = this as unknown as TerminalState;
      return String(self.all.length).length;
    },
    get empty() {
      const self = this as unknown as TerminalState;
      return self.rows.length === 0 && !self.streaming;
    },
    get showJump() {
      const self = this as unknown as TerminalState;
      return !self.following && (self.streaming || self.rows.length > 0);
    },
    init(this: TerminalState) {
      this.rebuild();
      const el = this.$root;
      const onWrite = (e: Event) => {
        const d = (e as CustomEvent<{ lines?: Line | Line[]; replace?: boolean }>).detail;
        if (d?.lines !== undefined) this.write(d.lines, d.replace);
      };
      const onState = (e: Event) => {
        const d = (e as CustomEvent<{ streaming?: boolean }>).detail;
        if (typeof d?.streaming === "boolean") {
          this.streaming = d.streaming;
          this.$nextTick(() => this.pin());
        }
      };
      el.addEventListener("nq-terminal-write", onWrite);
      el.addEventListener("nq-terminal-state", onState);
    },
    destroy(this: TerminalState) {
      if (this.copyTimer) clearTimeout(this.copyTimer);
    },
    rebuild(this: TerminalState) {
      const out: Row[] = [];
      this.lines.forEach((line, i) => {
        const data = typeof line === "string" ? { text: line } : line;
        const kind: Kind = (data as { kind?: Kind }).kind ?? "output";
        const id = (data as { id?: string | number }).id ?? i;
        parseAnsiRows(data.text).forEach((spans, r) => out.push({ key: `${id}:${r}`, kind, spans, prompt: kind === "command" && r === 0 }));
      });
      this.all = out;
      this.$nextTick(() => this.pin());
    },
    write(this: TerminalState, incoming: Line | Line[], replace = false) {
      const next = Array.isArray(incoming) ? incoming : [incoming];
      this.lines = replace ? [...next] : [...this.lines, ...next];
      this.rebuild();
    },
    clear(this: TerminalState) {
      this.lines = [];
      this.rebuild();
      this.$dispatch("nq-terminal-clear");
    },
    pin(this: TerminalState) {
      const out = this.$refs.output;
      if (out && this.following) out.scrollTop = out.scrollHeight;
    },
    onScroll(this: TerminalState) {
      const out = this.$refs.output;
      if (out) this.following = out.scrollHeight - out.scrollTop - out.clientHeight <= 24;
    },
    jump(this: TerminalState) {
      this.following = true;
      this.pin();
    },
    async copy(this: TerminalState) {
      const text = this.lines
        .map((l) => stripAnsi(typeof l === "string" ? l : l.kind === "command" ? `${this.prompt} ${l.text}` : l.text))
        .join("\n");
      this.copied = await copyText(text);
      if (this.copied) this.$dispatch("nq-terminal-copy", { text });
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => (this.copied = false), 1500);
    },
    async submit(this: TerminalState) {
      const command = this.command.trim();
      if (!command || this.busy) return;
      this.history = [command, ...this.history].slice(0, 50);
      this.cursor = -1;
      this.command = "";
      this.busy = true;
      const waits: Promise<unknown>[] = [];
      this.$dispatch("nq-terminal-command", { command, wait: (p: Promise<unknown>) => void waits.push(p) });
      try {
        await Promise.allSettled(waits);
      } finally {
        this.busy = false;
        this.$nextTick(() => (this.$refs.input as HTMLInputElement | undefined)?.focus());
      }
    },
    onKey(this: TerminalState, e: KeyboardEvent) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      this.cursor = Math.min(this.history.length - 1, Math.max(-1, this.cursor + (e.key === "ArrowUp" ? 1 : -1)));
      this.command = this.cursor === -1 ? "" : (this.history[this.cursor] ?? "");
    },
    trimmedText(this: TerminalState) {
      const n = this.hidden;
      return ((n === 1 ? this.strings.trimmedOne : this.strings.trimmedMany) ?? "").replace("{n}", String(n));
    },
    spanStyle(s: AnsiSpan["style"]) {
      const fg = s.inverse ? (s.bg ?? "var(--nq-surface-soft)") : s.fg;
      const bg = s.inverse ? (s.fg ?? "var(--nq-fg)") : s.bg;
      if (!fg && !bg && !s.dim) return undefined;
      return { ...(fg ? { color: fg } : {}), ...(bg ? { backgroundColor: bg } : {}), ...(s.dim ? { opacity: "0.65" } : {}) };
    },
    spanClass(s: AnsiSpan["style"]) {
      return [s.bold && "font-bold", s.italic && "italic", (s.underline || s.strike) && "underline", s.strike && "line-through"].filter(Boolean).join(" ");
    },
    rowClass(this: TerminalState, row: Row) {
      return `flex min-h-[1lh] px-3 ${KIND_CLASS[row.kind]} ${this.wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`;
    },
  }));
};
