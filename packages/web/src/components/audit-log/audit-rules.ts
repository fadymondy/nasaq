/** Pure helpers of the audit log: field diffs, filtering and retention. No React. */

export type AuditChannel = "web" | "api" | "mcp";
export const AUDIT_CHANNELS: readonly AuditChannel[] = ["web", "api", "mcp"];

export interface AuditChange {
  /** The field that changed, for example `role` or `billing.email`. */
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface AuditActor {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface AuditEntry {
  id: string;
  at: string | number | Date;
  /** Who did it. `null` for the system. */
  actor: AuditActor | null;
  /** Machine action id, for example `member.role_changed`. */
  action: string;
  /** What it touched. */
  entity: { type: string; id?: string; label?: string };
  channel: AuditChannel;
  ip?: string;
  /** Field-level changes. Use `diffRecords` to build them from two snapshots. */
  changes?: readonly AuditChange[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);

/** Deep equality for JSON-like values and dates. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  if (isObject(a) && isObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if (!sameValue(a[k], b[k])) return false;
    return true;
  }
  return false;
}

/**
 * Field-level diff of two snapshots. Nested objects flatten to dotted paths; arrays and scalars compare as
 * a whole. A field only in `after` has no `before` key, and one only in `before` has no `after` key.
 */
export function diffRecords(before: Record<string, unknown> | null | undefined, after: Record<string, unknown> | null | undefined, prefix = ""): AuditChange[] {
  const a = before ?? {};
  const b = after ?? {};
  const out: AuditChange[] = [];
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const path = prefix ? `${prefix}.${key}` : key;
    const x = a[key];
    const y = b[key];
    if (isObject(x) && isObject(y)) {
      out.push(...diffRecords(x, y, path));
    } else if (!sameValue(x, y)) {
      const change: AuditChange = { field: path };
      if (key in a) change.before = x;
      if (key in b) change.after = y;
      out.push(change);
    }
  }
  return out;
}

export type ChangeKind = "added" | "removed" | "changed";

export function changeKind(change: AuditChange): ChangeKind {
  const hasBefore = change.before !== undefined && change.before !== null;
  const hasAfter = change.after !== undefined && change.after !== null;
  if (!hasBefore && hasAfter) return "added";
  if (hasBefore && !hasAfter) return "removed";
  return "changed";
}

/** A short text for a value in a diff. Strings stay as they are; objects become compact JSON. */
export function formatChangeValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export interface AuditFilters {
  actors?: readonly string[];
  actions?: readonly string[];
  entities?: readonly string[];
  channels?: readonly AuditChannel[];
  /** Inclusive local days. Either end may be missing. */
  from?: Date | null;
  to?: Date | null;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** The actor filter id of an entry: the actor id, or `"system"` when there is none. */
export const actorKey = (entry: AuditEntry) => entry.actor?.id ?? "system";

export function filterEntries<T extends AuditEntry>(entries: readonly T[], f: AuditFilters): T[] {
  const from = f.from ? startOfDay(f.from) : null;
  const to = f.to ? startOfDay(f.to) + 86_400_000 : null;
  return entries.filter((e) => {
    if (f.actors?.length && !f.actors.includes(actorKey(e))) return false;
    if (f.actions?.length && !f.actions.includes(e.action)) return false;
    if (f.entities?.length && !f.entities.includes(e.entity.type)) return false;
    if (f.channels?.length && !f.channels.includes(e.channel)) return false;
    const at = new Date(e.at).getTime();
    if (from !== null && at < from) return false;
    if (to !== null && at >= to) return false;
    return true;
  });
}

/** Entries older than this instant are deleted by a retention of `days`. `null` (keep forever) has no cutoff. */
export function retentionCutoff(days: number | null, now: Date | number = Date.now()): number | null {
  if (days === null || !Number.isFinite(days) || days <= 0) return null;
  return new Date(now).getTime() - days * 86_400_000;
}

/** How many entries a shorter retention would delete right now. */
export function expiringCount(entries: readonly AuditEntry[], days: number | null, now: Date | number = Date.now()): number {
  const cutoff = retentionCutoff(days, now);
  return cutoff === null ? 0 : entries.filter((e) => new Date(e.at).getTime() < cutoff).length;
}
