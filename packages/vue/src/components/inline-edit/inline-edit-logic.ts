/* Pure logic of InlineEdit: what a commit does and what a key means. No imports, so node --test runs it directly. */

export type InlineEditType = "text" | "number" | "url" | "email";

export interface InlineCommitInput {
  draft: string;
  initial: string;
  type?: InlineEditType;
  /** An empty value is not allowed. */
  required?: boolean;
  /** Trim whitespace around the value. Default true. */
  trim?: boolean;
  maxLength?: number;
  /** Custom check. Return a message to reject. */
  validate?: (value: string) => string | undefined;
}

export type InlineCommitResult =
  | { kind: "unchanged"; value: string }
  | { kind: "invalid"; value: string; reason: "required" | "type" | "length" | "custom"; message?: string }
  | { kind: "save"; value: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only http(s) links: `javascript:` and friends are never accepted. */
export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Arabic-Indic and Persian digits to Latin, so a number typed on an Arabic keyboard parses. */
export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Decides what committing a draft does: nothing (unchanged), reject it (with the reason), or save the cleaned value. */
export function resolveInlineCommit({ draft, initial, type = "text", required, trim = true, maxLength, validate }: InlineCommitInput): InlineCommitResult {
  let value = trim ? draft.trim() : draft;
  if (type === "number") value = normalizeDigits(value).replace(/٫/g, ".").replace(/٬/g, "");
  if (!value) {
    if (required) return { kind: "invalid", value, reason: "required" };
    return value === initial ? { kind: "unchanged", value } : { kind: "save", value };
  }
  if (type === "number" && !Number.isFinite(Number(value))) return { kind: "invalid", value, reason: "type" };
  if (type === "email" && !EMAIL.test(value)) return { kind: "invalid", value, reason: "type" };
  if (type === "url" && !isHttpUrl(value)) return { kind: "invalid", value, reason: "type" };
  if (maxLength !== undefined && [...value].length > maxLength) return { kind: "invalid", value, reason: "length" };
  const message = validate?.(value);
  if (message) return { kind: "invalid", value, reason: "custom", message };
  return value === initial ? { kind: "unchanged", value } : { kind: "save", value };
}

export interface InlineKeyInput {
  key: string;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  /** An IME is composing (Arabic/CJK input methods): Enter belongs to the IME. */
  isComposing?: boolean;
}

/** Enter saves a single line; a multi-line field saves with Ctrl/Cmd+Enter and keeps Enter for line breaks. Escape cancels. */
export function inlineKeyAction(e: InlineKeyInput, multiline: boolean): "save" | "cancel" | null {
  if (e.isComposing) return null;
  if (e.key === "Escape") return "cancel";
  if (e.key === "Enter") {
    if (!multiline) return e.shiftKey ? null : "save";
    return e.metaKey || e.ctrlKey ? "save" : null;
  }
  return null;
}
