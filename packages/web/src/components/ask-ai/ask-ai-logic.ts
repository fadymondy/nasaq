/** Pure helpers behind AskAiSelection and AiInsightCard. No React, so they run under node --test. */

export interface NormalizedSelection {
  /** Whitespace collapsed and trimmed. Empty when the selection is out of range. */
  text: string;
  /** The selection was longer than `max` and was cut. */
  truncated: boolean;
}

/**
 * Cleans what the visitor selected. Runs of whitespace (line breaks from block elements, table cells) become one
 * space. Shorter than `min` counts as nothing, and longer than `max` is cut, so the prompt stays bounded.
 */
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

/** Whether the selection sits in something the popover must not react to: a form field, an editor or an opt-out area. */
export function isIgnoredTarget(el: Element | null): boolean {
  return Boolean(el?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-ask-ai-ignore]'));
}

export type AskAiOutcome = string | { text?: string; error?: string } | void;

/** Reads the answer text or error out of whatever `onAsk` returned. */
export function readOutcome(outcome: AskAiOutcome): { text: string } | { error: string } {
  if (typeof outcome === "string") return outcome.trim() === "" ? { error: "" } : { text: outcome };
  if (outcome && typeof outcome === "object") {
    if (outcome.error) return { error: outcome.error };
    if (outcome.text && outcome.text.trim() !== "") return { text: outcome.text };
  }
  return { error: "" };
}

/** Sign of a change for tone: with `invert`, down is good. */
export function deltaTone(delta: number, invert = false): "positive" | "negative" | "neutral" {
  if (!Number.isFinite(delta) || delta === 0) return "neutral";
  return delta > 0 !== invert ? "positive" : "negative";
}
