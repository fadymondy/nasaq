/* Pure layout logic for the dashboard board. No imports, so it runs under node --test. */

export type BoardSettingValue = string | number | boolean;

export interface BoardItem {
  id: string;
  type: string;
  /** Columns wide, 1 to the board maximum. */
  cols: number;
  /** Rows tall. */
  rows: number;
  pinned?: boolean;
  settings?: Record<string, BoardSettingValue>;
}

export interface BoardItemLimits {
  minCols?: number;
  maxCols?: number;
  minRows?: number;
  maxRows?: number;
}

export const BOARD_MAX_COLS = 4;
export const BOARD_MAX_ROWS = 4;

export const clampSpan = (value: number, min: number, max: number) => {
  const v = Number.isFinite(value) ? Math.round(value) : min;
  return Math.min(Math.max(v, min), Math.max(min, max));
};

/** Pinned items first, each group keeping its order. */
export function applyPins<T extends { pinned?: boolean }>(items: readonly T[]): T[] {
  return [...items.filter((i) => i.pinned), ...items.filter((i) => !i.pinned)];
}

/** Moves `activeId` to where `overId` is, then keeps pinned items in front. */
export function reorderItems<T extends { id: string; pinned?: boolean }>(items: readonly T[], activeId: string, overId: string): T[] {
  const from = items.findIndex((i) => i.id === activeId);
  const to = items.findIndex((i) => i.id === overId);
  if (from < 0 || to < 0 || from === to) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return applyPins(next);
}

/** One step earlier (-1) or later (+1) within its own group (pinned or not). */
export function moveItem<T extends { id: string; pinned?: boolean }>(items: readonly T[], id: string, step: -1 | 1): T[] {
  const i = items.findIndex((x) => x.id === id);
  const target = items[i + step];
  if (i < 0 || !target || !!target.pinned !== !!items[i]?.pinned) return [...items];
  return reorderItems(items, id, target.id);
}

export function togglePin<T extends { id: string; pinned?: boolean }>(items: readonly T[], id: string): T[] {
  return applyPins(items.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i)));
}

export function resizeItem<T extends BoardItem>(items: readonly T[], id: string, cols: number, rows: number, limits: BoardItemLimits = {}): T[] {
  return items.map((i) =>
    i.id === id
      ? { ...i, cols: clampSpan(cols, limits.minCols ?? 1, limits.maxCols ?? BOARD_MAX_COLS), rows: clampSpan(rows, limits.minRows ?? 1, limits.maxRows ?? BOARD_MAX_ROWS) }
      : i,
  );
}

/**
 * The span a resize handle reaches: the start span plus the pointer movement in cells. The cell size includes the
 * gap. In a right-to-left board pass `rtl` so dragging towards the inline end still widens.
 */
export function resizeFromDelta(
  start: { cols: number; rows: number },
  delta: { x: number; y: number },
  cell: { width: number; height: number },
  limits: BoardItemLimits = {},
  rtl = false,
) {
  const dx = rtl ? -delta.x : delta.x;
  return {
    cols: clampSpan(start.cols + (cell.width > 0 ? dx / cell.width : 0), limits.minCols ?? 1, limits.maxCols ?? BOARD_MAX_COLS),
    rows: clampSpan(start.rows + (cell.height > 0 ? delta.y / cell.height : 0), limits.minRows ?? 1, limits.maxRows ?? BOARD_MAX_ROWS),
  };
}

/** Columns the board shows for a container width. */
export function boardColumns(width: number, breaks: { two: number; four: number } = { two: 560, four: 900 }): 1 | 2 | 4 {
  return width >= breaks.four ? 4 : width >= breaks.two ? 2 : 1;
}

export interface BoardTypeInfo extends BoardItemLimits {
  type: string;
}

/**
 * Makes a saved layout safe to render: drops items whose widget no longer exists and repeated ids, clamps spans to
 * the widget limits and puts pinned items first.
 */
export function normalizeLayout<T extends BoardItem>(items: readonly T[], types: readonly BoardTypeInfo[]): T[] {
  const byType = new Map(types.map((t) => [t.type, t]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const info = byType.get(item.type);
    if (!info || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push({
      ...item,
      cols: clampSpan(item.cols, info.minCols ?? 1, info.maxCols ?? BOARD_MAX_COLS),
      rows: clampSpan(item.rows, info.minRows ?? 1, info.maxRows ?? BOARD_MAX_ROWS),
    });
  }
  return applyPins(out);
}

/** An id for a new item of `type` that is not taken: "chart", "chart-2", "chart-3". */
export function nextItemId(items: readonly { id: string }[], type: string): string {
  const taken = new Set(items.map((i) => i.id));
  if (!taken.has(type)) return type;
  let n = 2;
  while (taken.has(`${type}-${n}`)) n += 1;
  return `${type}-${n}`;
}

const settingsKey = (s?: Record<string, BoardSettingValue>) => JSON.stringify(Object.entries(s ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

export function sameLayout(a: readonly BoardItem[], b: readonly BoardItem[]): boolean {
  return (
    a.length === b.length &&
    a.every((x, i) => {
      const y = b[i];
      return !!y && x.id === y.id && x.type === y.type && x.cols === y.cols && x.rows === y.rows && !!x.pinned === !!y.pinned && settingsKey(x.settings) === settingsKey(y.settings);
    })
  );
}
