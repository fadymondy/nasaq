// Vertical drag-to-reorder with native pointer events (the React version uses dnd-kit's MouseSensor/TouchSensor
// and closestCenter). Mouse activates after `distance` px, touch and pen after a `delay` ms press that moves less than
// `tolerance` px (so a list still scrolls). While dragging, the active element follows the pointer and its siblings
// shift out of the way. Siblings are the parent's children that carry `data-sortable-id`.

export interface DragOptions {
  /** Pixels before a mouse drag starts. */
  distance: number;
  /** Press time before a touch drag starts, in ms. */
  delay: number;
  /** Pixels a touch may move during that press. */
  tolerance: number;
  /** Called on release with the dragged id and the id whose slot it ended over. */
  onMove: (activeId: string, overId: string) => void;
  /** Called when a drag ends (before onMove), e.g. to suppress the click that follows. */
  onEnd?: () => void;
}

interface Slot {
  id: string;
  el: HTMLElement;
  top: number;
  height: number;
}

/** Start tracking a press on `el`. Call from `pointerdown`; `el` is the sortable element (not the handle). */
export function beginPress(event: PointerEvent, el: HTMLElement, id: string, opts: DragOptions): void {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const parent = el.parentElement;
  if (!parent) return;
  const touch = event.pointerType !== "mouse";
  const startY = event.clientY;
  const startX = event.clientX;
  let active = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let slots: Slot[] = [];
  let from = -1;
  let to = -1;

  const blockScroll = (e: TouchEvent) => e.preventDefault();

  function cleanup() {
    clearTimeout(timer);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("touchmove", blockScroll);
    if (active) {
      active = false;
      el.removeAttribute("data-dragging");
      el.style.transform = "";
      for (const s of slots) {
        s.el.style.transform = "";
        s.el.style.transition = "";
      }
    }
  }

  const activate = () => {
    slots = [...parent.children]
      .filter((c): c is HTMLElement => c instanceof HTMLElement && c.hasAttribute("data-sortable-id") && c.getClientRects().length > 0)
      .map((c) => {
        const r = c.getBoundingClientRect();
        return { id: c.getAttribute("data-sortable-id") ?? "", el: c, top: r.top, height: r.height };
      })
      .sort((a, b) => a.top - b.top);
    from = slots.findIndex((s) => s.el === el);
    if (from < 0) return cleanup();
    to = from;
    active = true;
    el.setAttribute("data-dragging", "");
    for (const s of slots) if (s.el !== el) s.el.style.transition = "transform 200ms ease";
    window.addEventListener("touchmove", blockScroll, { passive: false });
  };

  const place = (dy: number) => {
    const me = slots[from];
    if (!me) return;
    el.style.transform = `translate3d(0, ${dy}px, 0)`;
    const center = me.top + me.height / 2 + dy;
    let best = from;
    let bestDist = Infinity;
    slots.forEach((s, i) => {
      const d = Math.abs(s.top + s.height / 2 - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    to = best;
    slots.forEach((s, i) => {
      if (i === from) return;
      let shift = 0;
      if (from < to && i > from && i <= to) shift = -me.height;
      else if (from > to && i < from && i >= to) shift = me.height;
      s.el.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : "";
    });
  };

  function onMove(e: PointerEvent) {
    if (e.pointerId !== event.pointerId) return;
    if (!active) {
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (touch) {
        if (dist > opts.tolerance) cleanup();
      } else if (dist >= opts.distance) {
        activate();
        if (active) place(e.clientY - startY);
      }
      return;
    }
    e.preventDefault();
    place(e.clientY - startY);
  }

  function onUp(e: PointerEvent) {
    if (e.pointerId !== event.pointerId) return;
    const wasActive = active;
    const overId = slots[to]?.id;
    const moved = wasActive && e.type === "pointerup" && to !== from && overId !== undefined;
    cleanup();
    if (wasActive) {
      opts.onEnd?.();
      if (moved) opts.onMove(id, overId as string);
    }
  }

  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  if (touch) timer = setTimeout(activate, opts.delay);
}
