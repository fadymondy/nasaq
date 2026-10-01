export type Cleanup = () => void;

export function on<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K | string,
  handler: (event: Event) => void,
  options?: AddEventListenerOptions,
): Cleanup {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

export function all(cleanups: Cleanup[]): Cleanup {
  return () => {
    for (const c of cleanups.splice(0)) c();
  };
}

let seq = 0;
/** A stable id for aria wiring; keeps an existing id. */
export function ensureId(el: Element, prefix = "nq"): string {
  if (!el.id) el.id = `${prefix}-${++seq}`;
  return el.id;
}

export function isRtlAt(el: Element): boolean {
  return getComputedStyle(el).direction === "rtl" || el.closest("[dir]")?.getAttribute("dir") === "rtl";
}

/**
 * Places a fixed floating element next to its anchor: below, aligned to the start edge (end edge in RTL),
 * flipped above when there is no room. Plain maths, no dependency.
 */
export function place(floating: HTMLElement, anchor: Element, side: "bottom" | "top" = "bottom", gap = 6): void {
  const a = anchor.getBoundingClientRect();
  const f = floating.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = side === "bottom" ? a.bottom + gap : a.top - f.height - gap;
  if (side === "bottom" && top + f.height > vh && a.top - f.height - gap >= 0) top = a.top - f.height - gap;
  if (side === "top" && top < 0) top = a.bottom + gap;
  let left = isRtlAt(anchor) ? a.right - f.width : a.left;
  left = Math.max(8, Math.min(left, vw - f.width - 8));
  floating.style.top = `${Math.round(top)}px`;
  floating.style.left = `${Math.round(left)}px`;
}
