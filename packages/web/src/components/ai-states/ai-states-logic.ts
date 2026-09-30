/** Pure helpers behind the AI state components. No React, so they run under node --test. */

export type AiConfidence = "high" | "medium" | "low";

/** Buckets a 0..1 score. Out of range and NaN clamp; NaN reads as low. */
export function confidenceLevel(value: number): AiConfidence {
  if (!Number.isFinite(value)) return "low";
  const v = Math.min(1, Math.max(0, value));
  return v >= 0.8 ? "high" : v >= 0.5 ? "medium" : "low";
}

/** A 0..1 score as a whole percentage. */
export function confidencePercent(value: number): number {
  return Number.isFinite(value) ? Math.round(Math.min(1, Math.max(0, value)) * 100) : 0;
}

export type AiStepState = "done" | "active" | "pending";

/** State of step `index` when step `current` is running. `current >= length` means every step is done. */
export function stepState(index: number, current: number): AiStepState {
  return index < current ? "done" : index === current ? "active" : "pending";
}

/** Next index for a rotating label, wrapping. */
export function cycleIndex(index: number, length: number): number {
  return length <= 0 ? 0 : (index + 1) % length;
}

/**
 * How many characters of `total` to show after `dtMs` more time, at `cps` characters a second.
 * The speed grows with the backlog, so a fast stream is never more than about half a second behind.
 * Never splits a surrogate pair (emoji).
 */
export function nextRevealLength(shown: number, total: number, dtMs: number, text: string, cps = 60): number {
  if (shown >= total) return total;
  const backlog = total - shown;
  const rate = cps + backlog * 2;
  let next = Math.min(total, shown + Math.max(1, Math.ceil((rate * Math.max(0, dtMs)) / 1000)));
  const code = text.charCodeAt(next - 1);
  if (next < total && code >= 0xd800 && code <= 0xdbff) next += 1;
  return next;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Makes a half-streamed Markdown string safe to render: it closes an open code fence, and repairs the last
 * line so a dangling `**`, backtick, `[link](`, or table row does not flash raw syntax or swallow the page.
 * The result is only for display; keep the raw text as the source of truth.
 */
export function safePartialMarkdown(source: string): string {
  const lines = source.split("\n");
  let fence: string | null = null;
  for (const line of lines) {
    const m = FENCE.exec(line);
    if (!m) continue;
    const marker = m[1] as string;
    if (!fence) fence = marker;
    else if (marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = null;
  }
  if (fence) return `${source}${source.endsWith("\n") ? "" : "\n"}${fence}`;

  const last = lines.length - 1;
  let tail = lines[last] ?? "";

  // An unfinished table row would render as a stray paragraph of pipes.
  if (/^\s*\|/.test(tail) && !/\|\s*$/.test(tail)) {
    lines.pop();
    return lines.join("\n");
  }

  // Dangling links and images: `[text](https://exa` and `[text` keep the text and lose the syntax.
  tail = tail.replace(/!?\[([^\]]*)\]\([^)]*$/, "$1").replace(/!?\[([^\]]*)$/, "$1");
  // A lone opening marker at the very end (`text **`) has nothing to wrap yet.
  tail = tail.replace(/(^|\s)(\*\*|__|~~|\*|`)$/, "$1");

  const ticks = (tail.match(/`/g) ?? []).length;
  if (ticks % 2 === 1) tail += "`";
  else if (ticks === 0) {
    const bold = (tail.match(/\*\*/g) ?? []).length;
    if (bold % 2 === 1) tail += "**";
    const strike = (tail.match(/~~/g) ?? []).length;
    if (strike % 2 === 1) tail += "~~";
    const single = (tail.replace(/\*\*/g, "").match(/\*/g) ?? []).length;
    if (single % 2 === 1 && !/^\s*\*\s/.test(tail)) tail += "*";
  }
  lines[last] = tail;
  return lines.join("\n");
}

export interface AiActionLike {
  id: string;
  label: string;
  description?: string;
  keywords?: readonly string[];
  recommended?: boolean;
}

const norm = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** Match quality of one action for a query: 0 no match, higher is better. */
export function scoreAction(action: AiActionLike, query: string): number {
  const q = norm(query);
  if (!q) return 1;
  const label = norm(action.label);
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 60;
  if (label.includes(q)) return 40;
  if (action.keywords?.some((k) => norm(k).includes(q))) return 30;
  if (action.description && norm(action.description).includes(q)) return 10;
  return 0;
}

export interface AiActionGroups<T> {
  recommended: T[];
  others: T[];
}

/**
 * Splits actions into Recommended and the rest. With a query the result is one ranked list (in `others`)
 * and non-matches drop out. Input order is kept otherwise.
 */
export function groupAiActions<T extends AiActionLike>(actions: readonly T[], query = ""): AiActionGroups<T> {
  const scored = actions
    .map((a, i) => ({ a, i, s: scoreAction(a, query) }))
    .filter((r) => r.s > 0)
    .sort((x, y) => y.s - x.s || Number(!!y.a.recommended) - Number(!!x.a.recommended) || x.i - y.i);
  if (query.trim()) return { recommended: [], others: scored.map((r) => r.a) };
  return {
    recommended: scored.filter((r) => r.a.recommended).map((r) => r.a),
    others: scored.filter((r) => !r.a.recommended).map((r) => r.a),
  };
}

/** Plain text of a summary for the clipboard: TL;DR, then the key points as a list. */
export function summaryToText(summary: { tldr: string; points?: readonly string[]; full?: string }, opts: { includeFull?: boolean } = {}): string {
  const parts = [summary.tldr.trim()];
  if (summary.points?.length) parts.push(summary.points.map((p) => `- ${p.trim()}`).join("\n"));
  if (opts.includeFull && summary.full?.trim()) parts.push(summary.full.trim());
  return parts.filter(Boolean).join("\n\n");
}
