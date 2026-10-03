/** Pure helpers for the brand loaders: frame data and progress maths, kept apart so they can be tested. */

/** The classic braille spinner: one dot travels round the cell. */
export const BRAILLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

/** A denser braille sweep that fills the cell and empties it again. */
export const BRAILLE_WAVE_FRAMES = ["⠁", "⠉", "⠋", "⠛", "⠟", "⠿", "⠾", "⠼", "⠸", "⠰", "⠠", "⠀"] as const;

export const clampPercent = (value: number) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);

export interface DotMatrixOptions {
  cols: number;
  rows: number;
  /** 0..100, or `null` for an indeterminate sweep. */
  value: number | null;
  /** Animation frame for the indeterminate sweep. */
  tick?: number;
  /** Width of the sweep's fading tail, in columns. */
  trail?: number;
}

/** The fill level (0..1) of each dot in a benday matrix, row by row. Odd rows are offset by half a column. */
export function dotMatrixLevels({ cols, rows, value, tick = 0, trail = 4 }: DotMatrixOptions): number[] {
  const out: number[] = [];
  const progress = value === null ? 0 : (clampPercent(value) / 100) * (cols + 0.5);
  const head = value === null ? tick % (cols + trail) : 0;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 0.5;
    for (let c = 0; c < cols; c++) {
      if (value === null) {
        const d = head - c - offset;
        out.push(d < 0 || d > trail ? 0 : 1 - d / trail);
      } else {
        out.push(Math.min(1, Math.max(0, progress - c - offset)));
      }
    }
  }
  return out;
}

/** Stroke length of a ring's arc for a 0..100 value, given the circle's radius. */
export function ringArc(value: number, radius: number) {
  const circumference = 2 * Math.PI * radius;
  return { circumference, dashOffset: circumference * (1 - clampPercent(value) / 100) };
}
