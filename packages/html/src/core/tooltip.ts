// Tooltip from an attribute: <button aria-label="Archive" data-nq-tooltip="Archive">…</button>
// Shown on hover (after a short delay) and on keyboard focus; Escape hides it. One shared element.

import { all, ensureId, on, place, type Cleanup } from "./dom";

let tip: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function shared(): HTMLElement {
  if (tip && tip.isConnected) return tip;
  tip = document.createElement("div");
  tip.className = "nq-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  ensureId(tip, "nq-tooltip");
  document.body.append(tip);
  return tip;
}

function show(anchor: HTMLElement) {
  const text = anchor.dataset.nqTooltip;
  if (!text) return;
  const el = shared();
  el.textContent = text;
  el.hidden = false;
  anchor.setAttribute("aria-describedby", el.id);
  place(el, anchor, anchor.dataset.side === "bottom" ? "bottom" : "top");
}

function hide(anchor?: HTMLElement) {
  clearTimeout(timer);
  if (tip) tip.hidden = true;
  anchor?.removeAttribute("aria-describedby");
}

export function tooltip(anchor: HTMLElement): Cleanup {
  const delay = Number(anchor.dataset.delay ?? 400);
  return all([
    on(anchor, "pointerenter", () => {
      clearTimeout(timer);
      timer = setTimeout(() => show(anchor), delay);
    }),
    on(anchor, "pointerleave", () => hide(anchor)),
    on(anchor, "focus", () => show(anchor)),
    on(anchor, "blur", () => hide(anchor)),
    on(anchor, "keydown", (e) => {
      if ((e as KeyboardEvent).key === "Escape") hide(anchor);
    }),
    () => hide(anchor),
  ]);
}
