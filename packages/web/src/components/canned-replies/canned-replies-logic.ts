/* Pure helpers for a library of canned replies: shortcut clean-up and validation. No React. */

export type CannedReplyIssue = "title-empty" | "shortcut-empty" | "shortcut-duplicate" | "body-empty" | "variable-unknown";

export interface CannedReplyDraftLike {
  id: string;
  shortcut: string;
  title: string;
  body: string;
}

/** What a person types after "/": lower case, no leading slash, spaces to hyphens, only letters, digits, "_" and "-". */
export function normalizeCannedShortcut(value: string): string {
  return value
    .trim()
    .replace(/^\/+/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
}

const VARIABLE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/** The distinct `{{keys}}` in a reply body, in order of first use. */
export function cannedReplyVariables(body: string): string[] {
  return [...new Set([...body.matchAll(VARIABLE)].map((m) => m[1] as string))];
}

/** Everything wrong with a reply, or an empty list. `others` are the other replies in the library. */
export function validateCannedReply(draft: CannedReplyDraftLike, others: readonly CannedReplyDraftLike[], knownVariables?: readonly string[]): CannedReplyIssue[] {
  const issues: CannedReplyIssue[] = [];
  if (!draft.title.trim()) issues.push("title-empty");
  const shortcut = normalizeCannedShortcut(draft.shortcut);
  if (!shortcut) issues.push("shortcut-empty");
  else if (others.some((o) => o.id !== draft.id && normalizeCannedShortcut(o.shortcut) === shortcut)) issues.push("shortcut-duplicate");
  if (!draft.body.trim()) issues.push("body-empty");
  else if (knownVariables && cannedReplyVariables(draft.body).some((k) => !knownVariables.includes(k))) issues.push("variable-unknown");
  return issues;
}

/** A shortcut for a copy that no other reply uses: "refund", "refund-2", "refund-3". */
export function nextFreeCannedShortcut(shortcut: string, others: readonly { shortcut: string }[]): string {
  const taken = new Set(others.map((o) => normalizeCannedShortcut(o.shortcut)));
  const base = normalizeCannedShortcut(shortcut) || "reply";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
