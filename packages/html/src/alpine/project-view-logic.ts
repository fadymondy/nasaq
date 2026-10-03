// The pure helpers of the project view's Alpine module (ported from project-logic.ts of the React component).

/** "api, billing,, #API" becomes ["api", "billing"]. */
export function projectParseTags(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(/[,،\n]/)) {
    const t = part.trim().replace(/^#/, "").toLowerCase();
    if (t) seen.add(t);
  }
  return [...seen];
}

/** Fill the %s of a template. */
export function projectFill(template: string, value: string): string {
  return template.replace("%s", value);
}

export interface FeedFilter {
  kind: string;
  actor: string;
}

/** A feed row matches when the type and the person are "all" or equal. */
export function projectFeedMatches(row: { kind: string; actor: string }, filter: FeedFilter): boolean {
  return (filter.kind === "all" || row.kind === filter.kind) && (filter.actor === "all" || row.actor === filter.actor);
}

export interface MemoryFilter {
  query: string;
  tags: readonly string[];
  kind: string;
}

/** Search text (in the haystack), kind, and every selected tag must match. */
export function projectMemoryMatches(row: { kind: string; tags: readonly string[]; haystack: string }, filter: MemoryFilter): boolean {
  const q = filter.query.trim().toLowerCase();
  if (filter.kind !== "all" && row.kind !== filter.kind) return false;
  if (filter.tags.length && !filter.tags.every((t) => row.tags.includes(t))) return false;
  return !q || row.haystack.includes(q);
}

/** The patch the issue list sends for an edited cell, or null for a column that is not editable. */
export function projectListPatch(column: string, value: unknown): Record<string, unknown> | null {
  const text = value === null || value === undefined ? "" : String(value);
  switch (column) {
    case "title":
      return { title: text.trim() };
    case "status":
      return { statusId: text };
    case "priority":
      return { priority: text };
    case "assignee":
      return { assigneeId: text === "" ? null : text };
    case "due":
      return { dueDate: text === "" ? null : text };
    case "estimate": {
      if (text.trim() === "") return { estimateHours: null };
      const n = Number(text);
      return { estimateHours: Number.isFinite(n) ? n : null };
    }
    default:
      return null;
  }
}

/** The budget typed in the settings form as a number, or null when empty or invalid. */
export function projectParseBudget(text: string): number | null {
  if (text.trim() === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
