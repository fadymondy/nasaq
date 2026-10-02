/** Pure helpers for onboarding: progress that survives a reload, invite parsing and the checklist summary. */

export type OnboardingStepId = "welcome" | "profile" | "workspace" | "invite" | "preferences" | "integration" | "finish";

export const ONBOARDING_STEPS: readonly OnboardingStepId[] = ["welcome", "profile", "workspace", "invite", "preferences", "integration", "finish"];

export interface OnboardingProgress<V = unknown> {
  /** Id of the step on screen. */
  current: string;
  /** Steps whose work was saved. */
  completed: string[];
  /** Optional steps the person chose to skip. */
  skipped: string[];
  /** What they typed so far, so a refresh does not lose it. */
  values: V;
  /** Epoch milliseconds of the last change. */
  updatedAt: number;
}

export function initialProgress<V>(firstStep: string, values: V, now = Date.now()): OnboardingProgress<V> {
  return { current: firstStep, completed: [], skipped: [], values, updatedAt: now };
}

const without = (list: readonly string[], id: string) => list.filter((x) => x !== id);
const withId = (list: readonly string[], id: string) => (list.includes(id) ? [...list] : [...list, id]);

/** Marks a step done. Doing a step un-skips it. */
export function markCompleted<V>(p: OnboardingProgress<V>, id: string, now = Date.now()): OnboardingProgress<V> {
  return { ...p, completed: withId(p.completed, id), skipped: without(p.skipped, id), updatedAt: now };
}

/** Marks an optional step skipped. A step that was already done stays done. */
export function markSkipped<V>(p: OnboardingProgress<V>, id: string, now = Date.now()): OnboardingProgress<V> {
  if (p.completed.includes(id)) return p;
  return { ...p, skipped: withId(p.skipped, id), updatedAt: now };
}

export function moveTo<V>(p: OnboardingProgress<V>, id: string, now = Date.now()): OnboardingProgress<V> {
  return p.current === id ? p : { ...p, current: id, updatedAt: now };
}

export function serializeProgress<V>(p: OnboardingProgress<V>): string {
  return JSON.stringify(p);
}

const isStringArray = (x: unknown): x is string[] => Array.isArray(x) && x.every((i) => typeof i === "string");

/**
 * Reads saved progress back. Anything malformed, or older than `maxAgeMs`, gives `null`. Ids that are no
 * longer steps are dropped, so a flow that changed between releases still resumes.
 */
export function parseProgress<V = unknown>(raw: string | null | undefined, validIds: readonly string[], options: { maxAgeMs?: number; now?: number } = {}): OnboardingProgress<V> | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.current !== "string" || !isStringArray(d.completed) || !isStringArray(d.skipped)) return null;
  if (typeof d.updatedAt !== "number" || !d.values || typeof d.values !== "object") return null;
  const now = options.now ?? Date.now();
  if (options.maxAgeMs !== undefined && now - d.updatedAt > options.maxAgeMs) return null;
  const valid = new Set(validIds);
  return {
    current: valid.has(d.current) ? d.current : (validIds[0] ?? d.current),
    completed: d.completed.filter((id) => valid.has(id)),
    skipped: d.skipped.filter((id) => valid.has(id)),
    values: d.values as V,
    updatedAt: d.updatedAt,
  };
}

/** Where to resume: the saved step, or the first required step still open. */
export function resumeIndex(p: OnboardingProgress | null, ids: readonly string[]): number {
  if (!p) return 0;
  const at = ids.indexOf(p.current);
  return at < 0 ? 0 : at;
}

export interface ParsedInviteEmails {
  valid: string[];
  invalid: string[];
  duplicates: string[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Splits pasted text on commas, semicolons, spaces and new lines (Latin and Arabic separators). */
export function parseInviteEmails(text: string, existing: readonly string[] = []): ParsedInviteEmails {
  const seen = new Set(existing.map((e) => e.toLowerCase()));
  const out: ParsedInviteEmails = { valid: [], invalid: [], duplicates: [] };
  for (const part of text.split(/[\s,;،؛]+/)) {
    const email = part.trim().replace(/^<|>$/g, "");
    if (!email) continue;
    if (!EMAIL.test(email)) {
      out.invalid.push(email);
      continue;
    }
    const key = email.toLowerCase();
    if (seen.has(key)) out.duplicates.push(email);
    else {
      seen.add(key);
      out.valid.push(email);
    }
  }
  return out;
}

export interface ChecklistItemState {
  id: string;
  done?: boolean;
}

export interface ChecklistSummary {
  done: number;
  total: number;
  percent: number;
  complete: boolean;
  /** Index of the first item not done, or -1. */
  nextIndex: number;
}

export function checklistSummary(items: readonly ChecklistItemState[]): ChecklistSummary {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100), complete: total > 0 && done === total, nextIndex: items.findIndex((i) => !i.done) };
}
