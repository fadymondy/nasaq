// Pure helpers behind the ask-ai Alpine module (ported from ask-ai-logic.ts of the React component). No DOM, so they run under node.

export interface NormalizedSelection {
  /** Whitespace collapsed and trimmed. Empty when the selection is out of range. */
  text: string;
  /** The selection was longer than `max` and was cut. */
  truncated: boolean;
}

/** Cleans what the visitor selected: runs of whitespace become one space; shorter than `min` is nothing; longer than `max` is cut. */
export function normalizeSelection(raw: string, min = 3, max = 2000): NormalizedSelection {
  const text = raw.replace(/\s+/g, " ").trim();
  if ([...text].length < min) return { text: "", truncated: false };
  const chars = [...text];
  return chars.length > max ? { text: chars.slice(0, max).join("").trimEnd(), truncated: true } : { text, truncated: false };
}

/** Shortens a quote for display, keeping the start and the end: "The quick … lazy dog". */
export function shortenMiddle(text: string, max = 160): string {
  const chars = [...text];
  if (chars.length <= max || max < 5) return text;
  const head = Math.ceil((max - 1) * 0.6);
  const tail = max - 1 - head;
  return `${chars.slice(0, head).join("").trimEnd()}… ${chars.slice(chars.length - tail).join("").trimStart()}`;
}

/** Whether the selection sits in something the popup must not react to: a form field, an editor or an opt-out area. */
export function isIgnoredTarget(el: Element | null): boolean {
  return Boolean(el?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-ask-ai-ignore]'));
}

export type AskAiOutcome = string | { text?: string; error?: string } | void;

/** Reads the answer text or error out of whatever the host returned. */
export function readOutcome(outcome: AskAiOutcome): { text: string } | { error: string } {
  if (typeof outcome === "string") return outcome.trim() === "" ? { error: "" } : { text: outcome };
  if (outcome && typeof outcome === "object") {
    if (outcome.error) return { error: outcome.error };
    if (outcome.text && outcome.text.trim() !== "") return { text: outcome.text };
  }
  return { error: "" };
}

/** Does this key event match a "mod shift space" style hotkey (mod is Ctrl or Command)? */
export function hotkeyMatches(hotkey: string, e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; code: string; key: string }): boolean {
  const want = hotkey.toLowerCase().split(/\s+/);
  const mod = want.includes("mod") ? e.ctrlKey || e.metaKey : true;
  const shift = want.includes("shift") === e.shiftKey;
  const last = want[want.length - 1] as string;
  const keyOk = last === "space" ? e.code === "Space" : e.key.toLowerCase() === last;
  return mod && shift && keyOk;
}

export interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Where to put a popup of `size` next to an anchor rect inside the viewport: centred on the anchor, on the preferred side
 * (flipped when there is no room), then clamped to the viewport with `pad` on every edge. Returns viewport coordinates.
 */
export function placePopup(
  anchor: Rect,
  size: { width: number; height: number },
  view: { width: number; height: number },
  side: "top" | "bottom",
  gap = 8,
  pad = 8,
): { top: number; left: number; side: "top" | "bottom" } {
  const above = anchor.top - gap - size.height >= pad;
  const below = anchor.bottom + gap + size.height <= view.height - pad;
  const use = side === "top" ? (above || !below ? "top" : "bottom") : below || !above ? "bottom" : "top";
  const top = use === "top" ? anchor.top - gap - size.height : anchor.bottom + gap;
  const left = anchor.left + anchor.width / 2 - size.width / 2;
  return {
    side: use,
    top: Math.max(pad, Math.min(top, Math.max(pad, view.height - pad - size.height))),
    left: Math.max(pad, Math.min(left, Math.max(pad, view.width - pad - size.width))),
  };
}
