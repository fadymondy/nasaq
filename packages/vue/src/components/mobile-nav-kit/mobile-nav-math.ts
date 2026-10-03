/** Pure helpers for the mobile nav kit. Offsets are "inline": positive moves the row toward the inline end. */

export type SwipeSide = "start" | "end";
export type SwipeState = SwipeSide | "closed";

/** Physical pointer distance to inline distance. In RTL a rightward drag is toward the inline start. */
export function toInlineOffset(dx: number, rtl: boolean): number {
  return rtl ? -dx : dx;
}

/**
 * Keeps a drag inside what the row can show. Dragging toward the inline end reveals the start actions (width
 * `startWidth`), the other way reveals the end actions. Past the edge the row resists, so it feels elastic.
 */
export function clampSwipe(offset: number, startWidth: number, endWidth: number, resistance = 0.25): number {
  if (offset > startWidth) return startWidth + (offset - startWidth) * resistance;
  if (offset < -endWidth) return -endWidth - (-endWidth - offset) * resistance;
  if (startWidth === 0 && offset > 0) return offset * resistance;
  if (endWidth === 0 && offset < 0) return offset * resistance;
  return offset;
}

/** Where the row rests when the finger lifts: open past `threshold` of the panel (or on a fast flick), else closed. */
export function settleSwipe(offset: number, startWidth: number, endWidth: number, opts: { threshold?: number; velocity?: number } = {}): SwipeState {
  const threshold = opts.threshold ?? 0.4;
  const velocity = opts.velocity ?? 0;
  if (offset > 0 && startWidth > 0) {
    if (offset >= startWidth * threshold || velocity > 0.5) return "start";
  } else if (offset < 0 && endWidth > 0) {
    if (-offset >= endWidth * threshold || velocity < -0.5) return "end";
  }
  return "closed";
}

/** The resting offset of a state. */
export function restOffset(state: SwipeState, startWidth: number, endWidth: number): number {
  return state === "start" ? startWidth : state === "end" ? -endWidth : 0;
}

/** Whether a drag is a horizontal swipe (so the page may not scroll) after the first few pixels. */
export function isHorizontalIntent(dx: number, dy: number, slop = 6): boolean {
  return Math.abs(dx) > slop && Math.abs(dx) > Math.abs(dy) * 1.2;
}

/** Arrow-key target inside a tab bar: wraps, and Left and Right swap in RTL. Returns the new index or null. */
export function nextTabIndex(index: number, count: number, key: string, rtl: boolean): number | null {
  if (count <= 0) return null;
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  const back = rtl ? "ArrowRight" : "ArrowLeft";
  if (key === forward) return (index + 1) % count;
  if (key === back) return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/** The scroll position that centres an item in a strip, kept inside the scrollable range. */
export function centerScroll(itemStart: number, itemSize: number, viewport: number, contentSize: number): number {
  const target = itemStart + itemSize / 2 - viewport / 2;
  return Math.max(0, Math.min(target, Math.max(0, contentSize - viewport)));
}
