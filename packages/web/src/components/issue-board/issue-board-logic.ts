/** Pure helpers for IssueBoard: toolbar filtering and mapping a drop in a filtered column back to the full one. */
import { foldSearch } from "../catalog-store/catalog-logic";
import type { Issue } from "../issue-view/issue-logic";

/** An issue on the board, with the extras a board card shows. */
export interface IssueBoardItem extends Issue {
  /** Who opened it. Used by the reporter filter. */
  reporterId?: string | null;
  votes?: number;
  /** The viewer has voted. */
  voted?: boolean;
  comments?: number;
  attachments?: number;
}

/** `"none"` matches issues without anyone; `null` matches everything. */
export interface IssueBoardFilter {
  query: string;
  assigneeId: string | null;
  reporterId: string | null;
}

export const EMPTY_ISSUE_FILTER: IssueBoardFilter = { query: "", assigneeId: null, reporterId: null };

export function isIssueFilterActive(filter: IssueBoardFilter): boolean {
  return filter.query.trim() !== "" || filter.assigneeId !== null || filter.reporterId !== null;
}

const matchPerson = (want: string | null, have: string | null | undefined) => want === null || (want === "none" ? !have : have === want);

/** Search matches the key, the title and label names, case-insensitive and Arabic-folded. */
export function filterIssues<T extends IssueBoardItem>(issues: readonly T[], filter: IssueBoardFilter, labelName: (id: string) => string | undefined = () => undefined): T[] {
  const q = foldSearch(filter.query.trim());
  return issues.filter((i) => {
    if (!matchPerson(filter.assigneeId, i.assigneeId) || !matchPerson(filter.reporterId, i.reporterId)) return false;
    if (!q) return true;
    return foldSearch([i.key, i.title, ...i.labelIds.map((id) => labelName(id) ?? "")].join(" ")).includes(q);
  });
}

/**
 * A card was dropped at `toIndex` among the *visible* cards of `toColumn`. Return its index among *all* the
 * column's issues, so hidden issues keep their places: it lands just before the visible card it was dropped on,
 * or just after the last visible card when dropped at the end.
 */
export function boardIndex(all: readonly Pick<Issue, "id" | "statusId">[], visibleIds: ReadonlySet<string>, movedId: string, toColumn: string, toIndex: number): number {
  const column = all.filter((i) => i.statusId === toColumn && i.id !== movedId);
  const visible = column.filter((i) => visibleIds.has(i.id));
  if (visible.length === 0) return column.length;
  if (toIndex < visible.length) return column.indexOf(visible[Math.max(0, toIndex)]!);
  return column.indexOf(visible[visible.length - 1]!) + 1;
}
