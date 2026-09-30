/* Pure helpers for DataTable's in-cell editing: value coercion, change detection and where focus goes after a commit. */

export type CellEditKind = "text" | "number" | "select" | "date" | "switch" | "custom";
export type CellValue = string | number | boolean | null;

export type CoerceResult = { ok: true; value: CellValue } | { ok: false; reason: "number" | "date" };

/** Turns what was typed into the column's value. Blank numbers and dates become `null`; text stays a string. */
export function coerceEditValue(kind: CellEditKind, raw: string): CoerceResult {
  if (kind === "number") {
    // Accept Arabic-Indic digits and the Arabic decimal separator, as people type them on an Arabic keyboard.
    const latin = raw
      .trim()
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/٫/g, ".")
      .replace(/٬/g, "")
      .replace(/,/g, "");
    if (latin === "") return { ok: true, value: null };
    const n = Number(latin);
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, reason: "number" };
  }
  if (kind === "date") {
    const v = raw.trim();
    if (v === "") return { ok: true, value: null };
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? { ok: true, value: v } : { ok: false, reason: "date" };
  }
  return { ok: true, value: raw };
}

/** Whether two cell values are the same for the purpose of skipping a pointless save. Empty text equals null. */
export function sameCellValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === undefined || v === null || v === "" ? null : v);
  return norm(a) === norm(b);
}

/** Key for per-cell state (pending, error). */
export const cellKey = (rowId: string, columnId: string) => `${rowId}\u0000${columnId}`;

export interface CellPos {
  row: number;
  col: number;
}

/**
 * Where to go after a commit. `down` stays in the column (no wrap), `right` and `left` walk the editable columns and
 * wrap to the next or previous row. Returns `null` at the edges. `editable(row, col)` says whether a cell can be edited.
 */
export function nextCell(
  from: CellPos,
  move: "down" | "up" | "right" | "left",
  rowCount: number,
  colCount: number,
  editable: (row: number, col: number) => boolean,
): CellPos | null {
  if (move === "down" || move === "up") {
    const step = move === "down" ? 1 : -1;
    for (let r = from.row + step; r >= 0 && r < rowCount; r += step) if (editable(r, from.col)) return { row: r, col: from.col };
    return null;
  }
  const step = move === "right" ? 1 : -1;
  let { row, col } = from;
  for (;;) {
    col += step;
    if (col >= colCount || col < 0) {
      row += step;
      col = step === 1 ? 0 : colCount - 1;
    }
    if (row < 0 || row >= rowCount) return null;
    if (editable(row, col)) return { row, col };
  }
}
