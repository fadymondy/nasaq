// Pure helpers of nqIssueBoard: toolbar filtering and mapping a drop in a filtered column back to the full one.
// Ported from the React issue-board-logic.ts; foldSearch is copied from catalog-store-logic.ts.

export interface BoardIssue {
  id: string;
  statusId: string;
  key: string;
  title: string;
  labelNames?: string[];
  assigneeId?: string | null;
  reporterId?: string | null;
}

export interface BoardFilter {
  query: string;
  assigneeId: string | null;
  reporterId: string | null;
}

export const EMPTY_FILTER: BoardFilter = { query: "", assigneeId: null, reporterId: null };

/** Search folding: case, accents, Arabic diacritics and the common letter variants are ignored. */
export function foldSearch(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function isFilterActive(filter: BoardFilter): boolean {
  return filter.query.trim() !== "" || filter.assigneeId !== null || filter.reporterId !== null;
}

const matchPerson = (want: string | null, have: string | null | undefined) => want === null || (want === "none" ? !have : have === want);

export function filterIssues<T extends BoardIssue>(issues: readonly T[], filter: BoardFilter): T[] {
  const q = foldSearch(filter.query.trim());
  return issues.filter((i) => {
    if (!matchPerson(filter.assigneeId, i.assigneeId) || !matchPerson(filter.reporterId, i.reporterId)) return false;
    if (!q) return true;
    return foldSearch([i.key, i.title, ...(i.labelNames ?? [])].join(" ")).includes(q);
  });
}

/** A card dropped at `toIndex` among the visible cards of `toColumn`: its index among all the column's issues. */
export function boardIndex(all: readonly Pick<BoardIssue, "id" | "statusId">[], visibleIds: ReadonlySet<string>, movedId: string, toColumn: string, toIndex: number): number {
  const column = all.filter((i) => i.statusId === toColumn && i.id !== movedId);
  const visible = column.filter((i) => visibleIds.has(i.id));
  if (visible.length === 0) return column.length;
  if (toIndex < visible.length) return column.indexOf(visible[Math.max(0, toIndex)]!);
  return column.indexOf(visible[visible.length - 1]!) + 1;
}
