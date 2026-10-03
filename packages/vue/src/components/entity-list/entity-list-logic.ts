// Framework-neutral pieces of the entity list, shared by its Vue components. Internal: not part of the public index.
import type { DataTableFacetOption } from "../data-table";

/** A multi-select filter whose value can be several per row (tags, members). */
export interface EntityFacet<T> {
  id: string;
  /** Button label, e.g. "Tags". Localise it. */
  title: string;
  options: DataTableFacetOption[];
  /** Every value this row has for the facet. The row matches when it has any of the chosen values. */
  getValues: (row: T) => string[];
}

export type EntityListView = "table" | "cards";

export const ENTITY_STRINGS = {
  en: {
    viewTable: "Table view",
    viewCards: "Card view",
    viewSwitch: "Layout",
    sort: "Sort",
    sortBy: "Sort by",
    clearAll: "Clear filters",
    results: (n: string) => `${n} results`,
    resultsOne: "1 result",
    selectRowCard: (name: string) => `Select ${name}`,
    loadingList: "Loading the list",
    facetReset: "Reset",
  },
  ar: {
    viewTable: "عرض جدول",
    viewCards: "عرض بطاقات",
    viewSwitch: "التخطيط",
    sort: "الترتيب",
    sortBy: "ترتيب حسب",
    clearAll: "مسح التصفية",
    results: (n: string) => `${n} نتيجة`,
    resultsOne: "نتيجة واحدة",
    selectRowCard: (name: string) => `تحديد ${name}`,
    loadingList: "جارٍ تحميل القائمة",
    facetReset: "إعادة الضبط",
  },
};
export type EntityListLabels = typeof ENTITY_STRINGS.en;

/** The rows that have any of the chosen values in every active facet. */
export function filterByFacets<T>(data: T[], facets: readonly EntityFacet<T>[], state: Record<string, string[]>): T[] {
  const active = facets.filter((f) => state[f.id]?.length);
  if (!active.length) return data;
  return data.filter((row) =>
    active.every((f) => {
      const wanted = new Set(state[f.id]);
      return f.getValues(row).some((v) => wanted.has(v));
    }),
  );
}

/**
 * Room the top row of a card leaves at its inline end for the checkbox and the row menu, as the CSS variable
 * --entity-card-controls. Only the top row uses it, so the rest of the card keeps its full width.
 */
export function controlsWidth(checkbox: boolean, menu: boolean): string {
  if (checkbox && menu) return "3.25rem";
  if (menu) return "2rem";
  if (checkbox) return "1.5rem";
  return "0px";
}

/** The card in the next row up or down whose start edge is closest to this one's. */
export function verticalCard(rects: readonly { top: number; left: number }[], from: number, dir: 1 | -1): number {
  const origin = rects[from];
  if (!origin) return from;
  let best = from;
  let bestDy = Infinity;
  let bestDx = Infinity;
  rects.forEach((b, i) => {
    const dy = (b.top - origin.top) * dir;
    if (dy <= 4) return;
    const dx = Math.abs(b.left - origin.left);
    if (dy < bestDy - 4 || (Math.abs(dy - bestDy) <= 4 && dx < bestDx)) {
      best = i;
      bestDy = dy;
      bestDx = dx;
    }
  });
  return best;
}
