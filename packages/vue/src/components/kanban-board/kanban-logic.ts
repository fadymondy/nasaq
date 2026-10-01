// Pure helpers behind KanbanBoard: grouping, moving and where a pointer drop lands. No dnd-kit: the board uses native pointer events.

export type Items = Record<string, string[]>;

export interface KanbanColumnLike {
  id: string;
}
export interface KanbanCardLike {
  id: string;
  columnId: string;
}

export function groupCards(columns: readonly KanbanColumnLike[], cards: readonly KanbanCardLike[]): Items {
  const items: Items = Object.fromEntries(columns.map((c) => [c.id, [] as string[]]));
  for (const card of cards) items[card.columnId]?.push(card.id);
  return items;
}

export const findContainer = (items: Items, id: string): string | undefined => (id in items ? id : Object.keys(items).find((key) => items[key]?.includes(id)));

/** Takes the card out of wherever it is and puts it at `index` of `column` (the index it has once removed from its old place). */
export function placeCard(items: Items, id: string, column: string, index: number): Items {
  const next: Items = {};
  for (const [key, list] of Object.entries(items)) next[key] = list.filter((x) => x !== id);
  const target = next[column] ?? [];
  const at = Math.max(0, Math.min(target.length, index));
  next[column] = [...target.slice(0, at), id, ...target.slice(at)];
  return next;
}

/** One column as measured on screen: its horizontal extent and the vertical centre of each card (the dragged card left out). */
export interface ColumnGeometry {
  id: string;
  left: number;
  right: number;
  centers: number[];
}

/** The column under the pointer (the nearest one when it is between columns) and the index among that column's other cards. */
export function dropTarget(columns: readonly ColumnGeometry[], x: number, y: number): { column: string; index: number } | null {
  let best: ColumnGeometry | undefined;
  let bestDistance = Infinity;
  for (const c of columns) {
    const d = x < c.left ? c.left - x : x > c.right ? x - c.right : 0;
    if (d < bestDistance) {
      best = c;
      bestDistance = d;
    }
  }
  if (!best) return null;
  return { column: best.id, index: best.centers.filter((cy) => cy < y).length };
}

/** Where an arrow key sends a lifted card: up and down within the column, left and right (flipped in RTL) to the neighbour column. */
export function keyMove(items: Items, columns: readonly KanbanColumnLike[], id: string, key: string, rtl: boolean): { column: string; index: number } | null {
  const from = findContainer(items, id);
  if (!from) return null;
  const list = items[from] ?? [];
  const at = list.indexOf(id);
  if (key === "ArrowUp") return at > 0 ? { column: from, index: at - 1 } : null;
  if (key === "ArrowDown") return at < list.length - 1 ? { column: from, index: at + 1 } : null;
  const step = key === (rtl ? "ArrowLeft" : "ArrowRight") ? 1 : key === (rtl ? "ArrowRight" : "ArrowLeft") ? -1 : 0;
  if (step === 0) return null;
  const ci = columns.findIndex((c) => c.id === from) + step;
  const target = columns[ci];
  if (!target) return null;
  return { column: target.id, index: Math.min(at, (items[target.id] ?? []).length) };
}
