// nqDetailLayout: tab state and keyboard for the detail page. The markup is the Blade detail-layout component.
//
//   <div x-data="nqDetailLayout('overview', [{ key: 'overview' }, { key: 'logs', section: 'Data' }])" x-modelable="active">
//     <button x-bind="tab('overview')">Overview</button> <section x-show="active === 'overview'">…</section>
//   </div>
//
// `tab(key, compact)` binds one tab button (roving tabindex, aria-current, data-active). Arrow keys step through the enabled tabs
// (Up/Down in the sidebar, Left/Right in the small-screen bar, flipped in RTL), Home and End jump; moving selects. `active` is
// x-modelable and fires `nq-change { value }`.

import { groupDetailTabs, stepDetailTab, type DetailTabLike } from "./detail-layout-logic";
import type { Magics, Register } from "./types";

interface LayoutState extends Magics {
  active: string;
  tabs: DetailTabLike[];
  select(key: string): void;
}

export const detailLayout: Register = (Alpine) => {
  Alpine.data("nqDetailLayout", (initial = "", tabs: DetailTabLike[] = []) => ({
    active: initial || tabs[0]?.key || "",
    tabs,
    init(this: LayoutState) {
      this.$watch("active", (value: string) => this.$dispatch("nq-change", { value }));
    },
    select(this: LayoutState, key: string) {
      this.active = key;
    },
    tab(this: LayoutState, key: string, compact = false) {
      return {
        "data-key": key,
        ":data-active"(this: LayoutState) {
          return this.active === key ? "true" : undefined;
        },
        ":aria-current"(this: LayoutState) {
          return this.active === key ? "page" : undefined;
        },
        ":tabindex"(this: LayoutState) {
          return this.active === key ? 0 : -1;
        },
        "x-on:click"(this: LayoutState) {
          this.select(key);
        },
        "x-on:keydown"(this: LayoutState, e: KeyboardEvent) {
          const button = e.currentTarget as HTMLElement;
          const vertical = !compact;
          const rtl = getComputedStyle(button).direction === "rtl";
          const step =
            e.key === "Home" ? "first"
            : e.key === "End" ? "last"
            : (vertical ? e.key === "ArrowDown" : e.key === (rtl ? "ArrowLeft" : "ArrowRight")) ? 1
            : (vertical ? e.key === "ArrowUp" : e.key === (rtl ? "ArrowRight" : "ArrowLeft")) ? -1
            : null;
          if (step === null) return;
          const ordered = groupDetailTabs(this.tabs).flatMap((g) => g.tabs);
          const next = stepDetailTab(ordered, this.active, step);
          if (!next) return;
          e.preventDefault();
          this.select(next.key);
          [...(button.closest("nav")?.querySelectorAll<HTMLElement>('[data-slot="detail-tab"]') ?? [])].find((b) => b.dataset.key === next.key)?.focus();
        },
      };
    },
  }));
};
