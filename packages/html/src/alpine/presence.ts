// x-nq-presence="open": Base UI's enter/exit model for Alpine, so the React classes work unchanged.
// Showing: the element is displayed with data-open and data-starting-style, which is removed two frames
// later (so `data-starting-style:opacity-0` transitions in). Hiding: data-closed and data-ending-style are
// set and the element stays displayed until its transition ends. The first render applies the state
// without animating.
//
//   <div x-nq-presence="open" class="transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0">

import type { AlpineLike } from "./types";

function transitionMs(el: Element): number {
  const { transitionDuration, transitionDelay } = getComputedStyle(el);
  const ms = (v: string) => Math.max(0, ...v.split(",").map((s) => parseFloat(s) * (s.trim().endsWith("ms") ? 1 : 1000) || 0));
  return ms(transitionDuration) + ms(transitionDelay);
}

/** Calls `done` when el's transition ends, or straight away when it has none. Returns a canceller. */
export function afterTransition(el: Element, done: () => void): () => void {
  const total = transitionMs(el);
  if (!total) {
    done();
    return () => {};
  }
  let live = true;
  const end = () => {
    if (!live) return;
    live = false;
    el.removeEventListener("transitionend", onEnd);
    clearTimeout(timer);
    done();
  };
  const onEnd = (e: Event) => e.target === el && end();
  el.addEventListener("transitionend", onEnd);
  const timer = setTimeout(end, total + 50);
  return () => {
    live = false;
    el.removeEventListener("transitionend", onEnd);
    clearTimeout(timer);
  };
}

/** Shows or hides el with the Base UI data attributes; returns a canceller for a running transition. */
export function setPresence(el: HTMLElement, show: boolean, animate = true): () => void {
  if (show) {
    el.style.removeProperty("display");
    el.removeAttribute("data-closed");
    el.removeAttribute("data-ending-style");
    el.setAttribute("data-open", "");
    if (!animate) return () => {};
    el.setAttribute("data-starting-style", "");
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => el.removeAttribute("data-starting-style"));
    });
    return () => cancelAnimationFrame(frame);
  }
  el.removeAttribute("data-open");
  el.removeAttribute("data-starting-style");
  el.setAttribute("data-closed", "");
  if (!animate || el.style.display === "none") {
    el.style.display = "none";
    return () => {};
  }
  el.setAttribute("data-ending-style", "");
  return afterTransition(el, () => {
    el.style.display = "none";
    el.removeAttribute("data-ending-style");
  });
}

export function presence(Alpine: AlpineLike): void {
  Alpine.directive("nq-presence", (el, { expression }, { evaluateLater, effect, cleanup }) => {
    const node = el as HTMLElement;
    const read = evaluateLater<unknown>(expression);
    let first = true;
    let cancel = () => {};
    effect(() =>
      read((value) => {
        const show = Boolean(value);
        if (!first && show === node.hasAttribute("data-open")) return;
        cancel();
        cancel = setPresence(node, show, !first);
        first = false;
      }),
    );
    cleanup(() => cancel());
  });
}
