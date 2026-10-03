export type PaginationItem = number | "start-ellipsis" | "end-ellipsis";

const range = (from: number, to: number) => Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);

/**
 * The page numbers to show: `boundaries` pages at each end, `siblings` pages around the current one, and an
 * ellipsis where pages are skipped. Always the same number of slots, so the control does not jump as you page.
 */
export function getPaginationItems(page: number, pageCount: number, siblings = 1, boundaries = 1): PaginationItem[] {
  const startPages = range(1, Math.min(boundaries, pageCount));
  const endPages = range(Math.max(pageCount - boundaries + 1, boundaries + 1), pageCount);
  const siblingsStart = Math.max(Math.min(page - siblings, pageCount - boundaries - siblings * 2 - 1), boundaries + 2);
  const siblingsEnd = Math.min(Math.max(page + siblings, boundaries + siblings * 2 + 2), endPages.length > 0 ? (endPages[0] as number) - 2 : pageCount - 1);
  const before: PaginationItem[] =
    siblingsStart > boundaries + 2 ? ["start-ellipsis"] : boundaries + 1 < pageCount - boundaries ? [boundaries + 1] : [];
  const after: PaginationItem[] =
    siblingsEnd < pageCount - boundaries - 1 ? ["end-ellipsis"] : pageCount - boundaries > boundaries ? [pageCount - boundaries] : [];
  return [...startPages, ...before, ...range(siblingsStart, siblingsEnd), ...after, ...endPages];
}
