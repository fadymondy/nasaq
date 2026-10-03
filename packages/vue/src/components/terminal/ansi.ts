/** ANSI escape handling for terminal output. Colours map to Nasaq tokens, never to fixed hex values. */

export interface AnsiStyle {
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  inverse?: boolean;
  strike?: boolean;
}

export interface AnsiSpan {
  text: string;
  style: AnsiStyle;
}

/** The eight standard colours as CSS values. Black is drawn muted so it stays readable on a dark surface. */
const BASE = [
  "var(--nq-fg-muted)",
  "var(--nq-danger-text)",
  "var(--nq-success-text)",
  "var(--nq-warning-text)",
  "var(--nq-info-text)",
  "var(--nq-tag-violet)",
  "var(--nq-tag-teal)",
  "var(--nq-fg)",
];

/** A colour from the 16-colour palette (`bright` = the 90-97 range). */
export function ansiColor(index: number, bright = false): string {
  const base = BASE[index & 7] as string;
  return bright ? `color-mix(in oklab, ${base}, var(--nq-fg) 30%)` : base;
}

/** A colour from the 256-colour palette. 0-15 use the token palette; the rest are computed. */
export function ansi256(n: number): string | undefined {
  if (!Number.isInteger(n) || n < 0 || n > 255) return undefined;
  if (n < 8) return ansiColor(n);
  if (n < 16) return ansiColor(n - 8, true);
  if (n >= 232) {
    const v = 8 + (n - 232) * 10;
    return `rgb(${v} ${v} ${v})`;
  }
  const c = n - 16;
  const level = (x: number) => (x === 0 ? 0 : 55 + x * 40);
  return `rgb(${level(Math.floor(c / 36))} ${level(Math.floor((c % 36) / 6))} ${level(c % 6)})`;
}

const CSI = /\u001b\[([0-9;:?]*)([@-~])/g;
const OSC = /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g;
const OTHER_ESC = /\u001b[()#][0-9A-Za-z]|\u001b[=>78MDEHc]/g;

/** Text with every escape sequence removed and carriage-return overwrites resolved: what a copy should contain. */
export function stripAnsi(text: string): string {
  return text
    .replace(OSC, "")
    .replace(CSI, "")
    .replace(OTHER_ESC, "")
    .split("\n")
    .map((line) => {
      const parts = line.replace(/\r$/, "").split("\r");
      return parts[parts.length - 1] ?? "";
    })
    .join("\n");
}

function applySgr(params: string, style: AnsiStyle): AnsiStyle {
  const codes = params === "" ? [0] : params.split(/[;:]/).map((p) => (p === "" ? 0 : Number(p)));
  let next: AnsiStyle = { ...style };
  for (let i = 0; i < codes.length; i++) {
    const c = codes[i] as number;
    if (c === 0) next = {};
    else if (c === 1) next.bold = true;
    else if (c === 2) next.dim = true;
    else if (c === 3) next.italic = true;
    else if (c === 4) next.underline = true;
    else if (c === 7) next.inverse = true;
    else if (c === 9) next.strike = true;
    else if (c === 22) {
      delete next.bold;
      delete next.dim;
    } else if (c === 23) delete next.italic;
    else if (c === 24) delete next.underline;
    else if (c === 27) delete next.inverse;
    else if (c === 29) delete next.strike;
    else if (c >= 30 && c <= 37) next.fg = ansiColor(c - 30);
    else if (c >= 90 && c <= 97) next.fg = ansiColor(c - 90, true);
    else if (c >= 40 && c <= 47) next.bg = ansiColor(c - 40);
    else if (c >= 100 && c <= 107) next.bg = ansiColor(c - 100, true);
    else if (c === 39) delete next.fg;
    else if (c === 49) delete next.bg;
    else if (c === 38 || c === 48) {
      const key = c === 38 ? "fg" : "bg";
      const mode = codes[i + 1];
      if (mode === 5) {
        const colour = ansi256(codes[i + 2] as number);
        if (colour) next[key] = colour;
        i += 2;
      } else if (mode === 2) {
        const [r, g, b] = [codes[i + 2], codes[i + 3], codes[i + 4]] as number[];
        if ([r, g, b].every((v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 255)) next[key] = `rgb(${r} ${g} ${b})`;
        i += 4;
      }
    }
  }
  return next;
}

/** Splits one chunk of text into styled spans. Returns the style at the end so the next line can continue it. */
export function parseAnsi(text: string, initial: AnsiStyle = {}): { spans: AnsiSpan[]; style: AnsiStyle } {
  const spans: AnsiSpan[] = [];
  let style = initial;
  let last = 0;
  const clean = text.replace(OSC, "").replace(OTHER_ESC, "");
  for (const m of clean.matchAll(CSI)) {
    const at = m.index ?? 0;
    if (at > last) spans.push({ text: clean.slice(last, at), style });
    if (m[2] === "m") style = applySgr(m[1] ?? "", style);
    last = at + m[0].length;
  }
  if (last < clean.length) spans.push({ text: clean.slice(last), style });
  return { spans, style };
}

/**
 * A whole output as rows of spans. A row is what shows after its last carriage return (progress bars
 * redraw one line), and colours carry across rows the way a terminal keeps them.
 */
export function parseAnsiRows(text: string): AnsiSpan[][] {
  const rows: AnsiSpan[][] = [];
  let style: AnsiStyle = {};
  for (const line of text.split("\n")) {
    let shown: AnsiSpan[] = [];
    for (const part of line.replace(/\r$/, "").split("\r")) {
      const parsed = parseAnsi(part, style);
      style = parsed.style;
      if (parsed.spans.length) shown = parsed.spans;
    }
    rows.push(shown);
  }
  return rows;
}
