// Tabs with the WAI-ARIA tabs pattern: roving tabindex, arrow keys (mirrored in RTL), Home/End.
//
//   <div data-nq="tabs">
//     <div class="nq-tabs-list" role="tablist">
//       <button class="nq-tabs-trigger" role="tab" aria-controls="t-overview" aria-selected="true">Overview</button>
//       <button class="nq-tabs-trigger" role="tab" aria-controls="t-activity">Activity</button>
//     </div>
//     <div class="nq-tabs-panel" role="tabpanel" id="t-overview">…</div>
//     <div class="nq-tabs-panel" role="tabpanel" id="t-activity" hidden>…</div>
//   </div>

import { all, ensureId, isRtlAt, on, type Cleanup } from "./dom";

export interface TabsHandle {
  select(id: string): void;
  readonly value: string | null;
  destroy: Cleanup;
}

function triggersOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]')).filter((t) => t.closest('[data-nq="tabs"]') === root);
}

export function tabs(root: HTMLElement): TabsHandle {
  const triggers = triggersOf(root);
  let value: string | null = null;

  for (const t of triggers) {
    ensureId(t, "nq-tab");
    const panel = t.getAttribute("aria-controls");
    const el = panel ? document.getElementById(panel) : null;
    if (el) el.setAttribute("aria-labelledby", t.id);
  }

  function select(id: string, focus = false) {
    const next = triggers.find((t) => t.getAttribute("aria-controls") === id || t.dataset.value === id);
    if (!next || next.matches(":disabled, [aria-disabled='true']")) return;
    for (const t of triggers) {
      const active = t === next;
      t.setAttribute("aria-selected", String(active));
      t.tabIndex = active ? 0 : -1;
      const panel = t.getAttribute("aria-controls");
      const el = panel ? document.getElementById(panel) : null;
      if (el) el.hidden = !active;
    }
    value = next.getAttribute("aria-controls") ?? next.dataset.value ?? null;
    if (focus) next.focus();
    root.dispatchEvent(new CustomEvent("nq:change", { bubbles: true, detail: { value } }));
  }

  const initial = triggers.find((t) => t.getAttribute("aria-selected") === "true") ?? triggers[0];
  if (initial) select(initial.getAttribute("aria-controls") ?? initial.dataset.value ?? "");

  const enabled = () => triggers.filter((t) => !t.matches(":disabled, [aria-disabled='true']"));
  const idOf = (t: HTMLElement) => t.getAttribute("aria-controls") ?? t.dataset.value ?? "";

  const cleanups = triggers.flatMap((t) => [
    on(t, "click", () => select(idOf(t))),
    on(t, "keydown", (event) => {
      const e = event as KeyboardEvent;
      const list = enabled();
      const i = list.indexOf(t);
      const rtl = isRtlAt(t);
      let to: HTMLElement | undefined;
      if (e.key === "ArrowRight") to = list[(i + (rtl ? -1 : 1) + list.length) % list.length];
      else if (e.key === "ArrowLeft") to = list[(i + (rtl ? 1 : -1) + list.length) % list.length];
      else if (e.key === "Home") to = list[0];
      else if (e.key === "End") to = list[list.length - 1];
      if (!to) return;
      e.preventDefault();
      select(idOf(to), true);
    }),
  ]);

  return {
    select: (id) => select(id),
    get value() {
      return value;
    },
    destroy: all(cleanups),
  };
}
