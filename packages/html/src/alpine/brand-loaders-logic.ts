// Pure maths for the brand loaders (the React loader-frames.ts, the parts the Alpine side needs).

export const clampPercent = (value: number) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);

/** The fill level (0..1) of each dot in a benday matrix, row by row. Odd rows are offset by half a column. */
export function dotMatrixLevels(cols: number, rows: number, value: number | null, tick = 0, trail = 4): number[] {
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
