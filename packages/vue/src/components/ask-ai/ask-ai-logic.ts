// Pure helpers behind NqAskAiSelection and NqAiInsightCard. Prefixed so the Vue index (`export *`) cannot clash.

export interface AskAiNormalizedSelection {
  /** Whitespace collapsed and trimmed. Empty when the selection is out of range. */
  text: string;
  /** The selection was longer than `max` and was cut. */
  truncated: boolean;
}

/** Cleans what the visitor selected: runs of whitespace become one space; shorter than `min` is nothing; longer than `max` is cut. */
export function askAiNormalizeSelection(raw: string, min = 3, max = 2000): AskAiNormalizedSelection {
  const text = raw.replace(/\s+/g, " ").trim();
  if ([...text].length < min) return { text: "", truncated: false };
  const chars = [...text];
  return chars.length > max ? { text: chars.slice(0, max).join("").trimEnd(), truncated: true } : { text, truncated: false };
}

/** Shortens a quote for display, keeping the start and the end: "The quick … lazy dog". */
export function askAiShortenMiddle(text: string, max = 160): string {
  const chars = [...text];
  if (chars.length <= max || max < 5) return text;
  const head = Math.ceil((max - 1) * 0.6);
  const tail = max - 1 - head;
  return `${chars.slice(0, head).join("").trimEnd()}… ${chars.slice(chars.length - tail).join("").trimStart()}`;
}

/** Whether the selection sits in something the popover must not react to: a form field, an editor or an opt-out area. */
export function askAiIsIgnoredTarget(el: Element | null): boolean {
  return Boolean(el?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-ask-ai-ignore]'));
}

export type AskAiOutcome = string | { text?: string; error?: string } | void;

/** Reads the answer text or error out of whatever `onAsk` returned. */
export function askAiReadOutcome(outcome: AskAiOutcome): { text: string } | { error: string } {
  if (typeof outcome === "string") return outcome.trim() === "" ? { error: "" } : { text: outcome };
  if (outcome && typeof outcome === "object") {
    if (outcome.error) return { error: outcome.error };
    if (outcome.text && outcome.text.trim() !== "") return { text: outcome.text };
  }
  return { error: "" };
}

/** Sign of a change for tone: with `invert`, down is good. */
export function askAiDeltaTone(delta: number, invert = false): "positive" | "negative" | "neutral" {
  if (!Number.isFinite(delta) || delta === 0) return "neutral";
  return delta > 0 !== invert ? "positive" : "negative";
}
