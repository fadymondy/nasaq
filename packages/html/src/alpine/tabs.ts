// nqTabs: switches between views of the same subject. The markup is the React Tabs', the state lives here.
//
//   <div x-data="nqTabs('board')" x-id="['nq-tabs']">
//     <div role="tablist" x-bind="list" class="relative …">
//       <button x-bind="tab('board')" class="… data-active:text-foreground">Board</button>
//       <span data-slot="tabs-indicator" class="… left-[var(--active-tab-left)]"></span>
//     </div>
//     <div x-bind="panel('board')">Board view</div>
//   </div>
//
// The selected tab gets data-active and the indicator gets the --active-tab-* variables, as with Base UI.
// Arrow keys move focus in reading order (flipped in RTL), Home and End jump; Enter or Space selects.
// value is x-modelable: <div x-data="nqTabs('board')" x-model="$wire.tab">.

import type { Magics, Register } from "./types";

type Value = string | number;

interface TabsState extends Magics {
  value: Value | null;
  select(value: Value): void;
  measure(): void;
}

function tabsOf(list: Element): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>('[role="tab"]')].filter((t) => t.closest('[role="tablist"]') === list);
}

export const tabs: Register = (Alpine) => {
  Alpine.data("nqTabs", (initial: Value | null = null) => ({
    value: initial,
    init(this: TabsState) {
      if (this.value === null) {
        const first = this.$el.querySelector<HTMLElement>('[role="tab"]:not([disabled])');
        this.value = first?.dataset.value ?? null;
      }
      this.$watch("value", () => this.$nextTick(() => this.measure()));
      this.$nextTick(() => this.measure());
      if (typeof ResizeObserver !== "undefined") {
        const list = this.$el.querySelector('[role="tablist"]');
        if (list) new ResizeObserver(() => this.measure()).observe(list);
      }
    },
    select(this: TabsState, value: Value) {
      this.value = value;
    },
    /** Puts the active tab's box on the indicator as --active-tab-left/top/width/height. */
    measure(this: TabsState) {
      for (const indicator of this.$el.querySelectorAll<HTMLElement>('[data-slot="tabs-indicator"]')) {
        const tab = indicator.parentElement?.querySelector<HTMLElement>('[role="tab"][data-active]');
        if (!tab) {
          indicator.style.display = "none";
          continue;
        }
        indicator.style.removeProperty("display");
        indicator.style.setProperty("--active-tab-left", `${tab.offsetLeft}px`);
        indicator.style.setProperty("--active-tab-top", `${tab.offsetTop}px`);
        indicator.style.setProperty("--active-tab-width", `${tab.offsetWidth}px`);
        indicator.style.setProperty("--active-tab-height", `${tab.offsetHeight}px`);
      }
    },
    /** Bind on the tab row. */
    list: {
      role: "tablist",
      "x-on:keydown"(this: TabsState, event: KeyboardEvent) {
        const list = event.currentTarget as HTMLElement;
        const vertical = list.getAttribute("aria-orientation") === "vertical";
        const rtl = getComputedStyle(list).direction === "rtl";
        const items = tabsOf(list).filter((t) => !t.hasAttribute("disabled") && !t.hasAttribute("data-disabled"));
        const at = items.indexOf(document.activeElement as HTMLElement);
        const next = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
        const prev = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
        let to = -1;
        if (event.key === next) to = (at + 1) % items.length;
        else if (event.key === prev) to = (at - 1 + items.length) % items.length;
        else if (event.key === "Home") to = 0;
        else if (event.key === "End") to = items.length - 1;
        if (to < 0 || !items.length) return;
        event.preventDefault();
        items[to]!.focus();
      },
    },
    /** Bind on one tab; give it the same value as its panel. */
    tab(this: TabsState, value: Value) {
      return {
        role: "tab",
        type: "button",
        "data-value": String(value),
        ":id"(this: TabsState) {
          return this.$id("nq-tabs", `tab-${value}`);
        },
        ":aria-controls"(this: TabsState) {
          return this.$id("nq-tabs", `panel-${value}`);
        },
        ":aria-selected"(this: TabsState) {
          return String(this.value === value);
        },
        ":tabindex"(this: TabsState) {
          return this.value === value ? 0 : -1;
        },
        ":data-active"(this: TabsState) {
          return this.value === value ? "" : undefined;
        },
        "x-on:click"(this: TabsState) {
          this.select(value);
        },
      };
    },
    /** Bind on the view for one tab. */
    panel(this: TabsState, value: Value) {
      return {
        role: "tabpanel",
        tabindex: "0",
        ":id"(this: TabsState) {
          return this.$id("nq-tabs", `panel-${value}`);
        },
        ":aria-labelledby"(this: TabsState) {
          return this.$id("nq-tabs", `tab-${value}`);
        },
        ":hidden"(this: TabsState) {
          return this.value !== value;
        },
      };
    },
  }));
};
