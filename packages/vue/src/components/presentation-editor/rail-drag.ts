// Pointer-drag maths for the slide rail (replaces @dnd-kit). The rail can run in a row or a column, so the nearest
// thumbnail centre in two dimensions decides where a dragged slide lands.

/** Pixels the pointer must travel before a press becomes a drag. */
export const DRAG_DISTANCE = 5;

/** Index of the centre closest to (x, y). */
export function closestThumb(centers: readonly { x: number; y: number }[], x: number, y: number): number {
  let best = 0;
  let bestDistance = Infinity;
  centers.forEach((c, i) => {
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}
