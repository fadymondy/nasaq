/** Pure helpers for ApprovalQueue: ordering, expiry, redaction and the review verdict. */

export type ApprovalKind = "action" | "review" | "moderation" | "request";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "converted";
export type ApprovalDate = string | number | Date;

export interface ApprovalCriterion {
  id: string;
  label: string;
  met: boolean;
}

export type ApprovalArgValue = string | number | boolean | null;

export interface ApprovalItem {
  id: string;
  kind: ApprovalKind;
  status: ApprovalStatus;
  title: string;
  description?: string;
  /** Who asked, or who wrote the content being moderated. */
  requester?: string;
  createdAt: ApprovalDate;
  /** When an unanswered item stops being actionable. */
  expiresAt?: ApprovalDate;
  /** The arguments of the action, shown as key and value. Keys in `redact` show a mask instead of the value. */
  args?: Record<string, ApprovalArgValue>;
  redact?: string[];
  /** Pass / fail checklist of a review. An unmet criterion blocks approval. */
  criteria?: ApprovalCriterion[];
  /** Quoted content of a moderation item: a comment, a testimonial. */
  quote?: string;
  /** The reason typed when the item was decided. */
  reason?: string;
  decidedBy?: string;
  decidedAt?: ApprovalDate;
}

export const toMs = (value: ApprovalDate) => (value instanceof Date ? value.getTime() : new Date(value).getTime());

/** True when a pending item has passed its expiry. Decided items never expire. */
export function isExpired(item: Pick<ApprovalItem, "status" | "expiresAt">, now = Date.now()) {
  return item.status === "pending" && item.expiresAt !== undefined && toMs(item.expiresAt) <= now;
}

/** The status to show: a pending item past its expiry reads as expired. */
export function approvalStatus(item: Pick<ApprovalItem, "status" | "expiresAt">, now = Date.now()): ApprovalStatus {
  return isExpired(item, now) ? "expired" : item.status;
}

/** Criteria that are not met. */
export const unmetCriteria = (item: Pick<ApprovalItem, "criteria">) => (item.criteria ?? []).filter((c) => !c.met);

/** Approve is allowed when the item is actionable and every review criterion is met. */
export function canApprove(item: ApprovalItem, now = Date.now()) {
  return approvalStatus(item, now) === "pending" && unmetCriteria(item).length === 0;
}

/** Reject and convert only need the item to be actionable. */
export const canDecide = (item: ApprovalItem, now = Date.now()) => approvalStatus(item, now) === "pending";

/** Pending first, soonest expiry first, then oldest first; everything decided after, newest first. */
export function sortQueue(items: readonly ApprovalItem[], now = Date.now()): ApprovalItem[] {
  const rank = (i: ApprovalItem) => (approvalStatus(i, now) === "pending" ? 0 : 1);
  return [...items].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) {
      const ea = a.expiresAt !== undefined ? toMs(a.expiresAt) : Number.POSITIVE_INFINITY;
      const eb = b.expiresAt !== undefined ? toMs(b.expiresAt) : Number.POSITIVE_INFINITY;
      if (ea !== eb) return ea < eb ? -1 : 1;
      return toMs(a.createdAt) - toMs(b.createdAt);
    }
    return toMs(b.decidedAt ?? b.createdAt) - toMs(a.decidedAt ?? a.createdAt);
  });
}

export const REDACTED_MASK = "••••••••";

/** Key and display value pairs of the arguments, with redacted keys masked. Values are never exposed for redacted keys. */
export function redactArgs(args: Record<string, ApprovalArgValue> | undefined, redact: readonly string[] = []) {
  return Object.entries(args ?? {}).map(([key, value]) => ({
    key,
    redacted: redact.includes(key),
    value: redact.includes(key) ? REDACTED_MASK : value === null ? "null" : String(value),
  }));
}

/** Count of items awaiting an answer right now. */
export const pendingCount = (items: readonly ApprovalItem[], now = Date.now()) => items.filter((i) => approvalStatus(i, now) === "pending").length;
