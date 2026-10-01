/** Pure helpers behind Linkify, ScrollFade and ProgressiveList. No DOM, so they run under node --test. */

export type LinkifySegment =
  | { type: "text"; text: string }
  | { type: "url"; text: string; href: string }
  | { type: "email"; text: string; href: string };

export interface LinkifyOptions {
  /** Turn addresses like `name@example.com` into `mailto:` links. Default true. */
  emails?: boolean;
}

/** `https://…`, `http://…` or `www.…`, then anything up to a space or a bracket, quote or Arabic punctuation mark. */
const URL_SOURCE = String.raw`(?:https?:\/\/|www\.)[^\s<>"'،؛؟۔]+`;
const EMAIL_SOURCE = String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+`;

const TRAILING = new Set([".", ",", ";", ":", "!", "?", "'", '"', "»", "…"]);
const PAIRS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

/** Removes sentence punctuation and unbalanced closing brackets from the end of a matched URL. */
export function linkifyTrim(raw: string): string {
  let end = raw.length;
  while (end > 0) {
    const ch = raw[end - 1] as string;
    if (TRAILING.has(ch)) {
      end -= 1;
      continue;
    }
    const open = PAIRS[ch];
    if (open) {
      const body = raw.slice(0, end);
      const opens = body.split(open).length - 1;
      const closes = body.split(ch).length - 1;
      if (closes > opens) {
        end -= 1;
        continue;
      }
    }
    break;
  }
  return raw.slice(0, end);
}

/**
 * Splits plain text into text, URL and email segments. Only `http`, `https` and `mailto` links are produced, so a
 * `javascript:` string can never become a link. Bare domains such as `example.com` are left alone on purpose.
 */
export function linkifyText(text: string, { emails = true }: LinkifyOptions = {}): LinkifySegment[] {
  const pattern = new RegExp(emails ? `(${URL_SOURCE})|(${EMAIL_SOURCE})` : `(${URL_SOURCE})`, "giu");
  const out: LinkifySegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const isUrl = match[1] !== undefined;
    const matched = isUrl ? linkifyTrim(match[1] as string) : (match[2] as string);
    if (!matched) continue;
    if (start > cursor) out.push({ type: "text", text: text.slice(cursor, start) });
    if (isUrl) {
      const href = /^https?:\/\//i.test(matched) ? matched : `https://${matched}`;
      out.push({ type: "url", text: matched, href });
    } else {
      out.push({ type: "email", text: matched, href: `mailto:${matched}` });
    }
    cursor = start + matched.length;
  }
  if (cursor < text.length) out.push({ type: "text", text: text.slice(cursor) });
  return out;
}

export interface ScrollFadeMetrics {
  /** Distance scrolled from the inline start edge, always >= 0 (use `Math.abs(scrollLeft)`, RTL scrollLeft is negative). */
  scrollStart: number;
  clientSize: number;
  scrollSize: number;
}

/** Which edges have more content hidden behind them. `threshold` absorbs sub-pixel rounding. */
export function scrollFadeState({ scrollStart, clientSize, scrollSize }: ScrollFadeMetrics, threshold = 1): { start: boolean; end: boolean } {
  if (scrollSize - clientSize <= threshold) return { start: false, end: false };
  const from = Math.max(0, scrollStart);
  return { start: from > threshold, end: from + clientSize < scrollSize - threshold };
}

/** CSS `mask-image` for a scroller with faded edges. `rtl` flips which physical side is the start. */
export function scrollFadeMask(state: { start: boolean; end: boolean }, size: number, rtl: boolean): string | undefined {
  if (!state.start && !state.end) return undefined;
  const side = rtl ? "left" : "right";
  const from = state.start ? `transparent 0, black ${size}px` : "black 0";
  const to = state.end ? `black calc(100% - ${size}px), transparent 100%` : "black 100%";
  return `linear-gradient(to ${side}, ${from}, ${to})`;
}

/** How many items to show after one more "show more" press. */
export function progressiveNextCount(current: number, total: number, step: number): number {
  return Math.min(total, Math.max(0, current) + Math.max(1, step));
}

/** How many items one press reveals, and how many stay hidden after it. */
export function progressiveRemaining(visible: number, total: number, step: number): { next: number; left: number } {
  const left = Math.max(0, total - visible);
  return { next: Math.min(left, Math.max(1, step)), left };
}
