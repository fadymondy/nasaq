// nqViewToggle: switches how a collection is shown (table, grid, board, list, calendar). The markup is the React
// ViewToggle's: a segmented toggle group in which exactly one view is pressed.
//
//   <div x-data="nqViewToggle('table', ['table', 'grid'], 'customers:view')" x-modelable="value" data-slot="view-toggle">
//     <div role="group" x-bind="group" data-slot="toggle-group" data-orientation="horizontal">
//       <button x-bind="item('table')" data-slot="toggle" data-view="table" aria-label="Table">…</button>
//       <button x-bind="item('grid')" data-slot="toggle" data-view="grid" aria-label="Grid">…</button>
//     </div>
//   </div>
//
// value is the pressed view and is x-modelable (x-model="view", wire:model). Pressing the pressed view does nothing:
// one view is always pressed. Arrow keys move focus in reading order (flipped in RTL), Home and End jump, focus
// loops; Space or Enter presses. With a storage key the choice is saved in localStorage and restored on init
// (after the first paint, like the React component). Each change also fires `nq-view-change` with { view }.

import type { Magics, Register } from "./types";

interface ViewToggleState extends Magics {
  value: string;
  views: string[];
  storageKey: string | null;
  current: string | null;
  select(view: string): void;
}

function itemsOf(group: Element): HTMLElement[] {
  return [...group.querySelectorAll<HTMLElement>('[data-slot="toggle"]')].filter(
    (t) => t.closest('[data-slot="toggle-group"]') === group && !t.hasAttribute("disabled"),
  );
}

export const viewToggle: Register = (Alpine) => {
  Alpine.data("nqViewToggle", (initial: string = "table", views: string[] = ["table", "grid"], storageKey: string | null = null) => ({
    value: initial,
    views: [...views],
    storageKey,
    current: null as string | null,
    init(this: ViewToggleState) {
      if (this.storageKey) {
        try {
          const stored = window.localStorage.getItem(this.storageKey);
          if (stored && this.views.includes(stored) && stored !== this.value) this.value = stored;
        } catch {
          /* storage blocked: the default view applies */
        }
      }
      this.$watch("value", (view: string) => {
        if (this.storageKey) {
          try {
            window.localStorage.setItem(this.storageKey, view);
          } catch {
            /* storage full or blocked: the choice still applies for this visit */
          }
        }
        this.$dispatch("nq-view-change", { view });
      });
    },
    select(this: ViewToggleState, view: string) {
      if (view !== this.value) this.value = view;
    },
    /** Bind on the toggle group. */
    group: {
      "x-on:keydown"(event: KeyboardEvent) {
        const group = event.currentTarget as HTMLElement;
        const items = itemsOf(group);
        const at = items.indexOf((event.target as HTMLElement).closest<HTMLElement>('[data-slot="toggle"]')!);
        if (at < 0 || !items.length) return;
        const rtl = getComputedStyle(group).direction === "rtl";
        const next = rtl ? "ArrowLeft" : "ArrowRight";
        const prev = rtl ? "ArrowRight" : "ArrowLeft";
        let to = -1;
        if (event.key === next) to = (at + 1) % items.length;
        else if (event.key === prev) to = (at - 1 + items.length) % items.length;
        else if (event.key === "Home") to = 0;
        else if (event.key === "End") to = items.length - 1;
        if (to < 0) return;
        event.preventDefault();
        items[to]!.focus();
      },
    },
    /** Bind on one view's button. */
    item(view: string) {
      return {
        type: "button",
        "data-value": view,
        ":aria-pressed"(this: ViewToggleState) {
          return String(this.value === view);
        },
        ":data-pressed"(this: ViewToggleState) {
          return this.value === view ? "" : undefined;
        },
        // Roving tabindex: the last focused item, else the pressed one.
        ":tabindex"(this: ViewToggleState) {
          const group = this.$el.closest('[data-slot="toggle-group"]');
          const items = group ? itemsOf(group) : [];
          const known = this.current !== null && items.some((i) => i.dataset.value === this.current);
          const tab = known ? this.current : this.value;
          return tab === view ? 0 : -1;
        },
        "x-on:focus"(this: ViewToggleState) {
          this.current = view;
        },
        "x-on:click"(this: ViewToggleState) {
          this.select(view);
        },
      };
    },
  }));
};
