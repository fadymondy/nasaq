// nqWebVitalsPage: keeps the gauge buttons and the per-metric trend panels of <x-nq::web-vitals-page> on the same metric, and carries its hooks.
//
//   <div x-data="nqWebVitalsPage('LCP', pages)" x-on:nq-metric="choose($event.detail.id)">
//     <button x-on:click="choose('LCP')" x-bind:aria-pressed="String(metric === 'LCP')">…gauge…</button>
//     <div x-show="metric === 'LCP'">…time series panel for LCP…</div>
//     <tr data-row-id="p1" x-on:click="pick($el.dataset.rowId)">…</tr>
//   </div>
//
// Choosing a gauge or switching the chart's own metric switcher (its "nq-metric" event) shows the matching panel and marks the gauge, and dispatches
// a bubbling "nq-select" ({ id }) from the root (React's onMetricChange). pick(id) dispatches "nq-page-click" ({ id, row }) with the row of `pages`
// (React's onPageClick). The device and period toggles' events, "nq-device-change" and "nq-period-change", come from nqPageToggle.

import type { Magics, Register } from "./types";

type PageRow = { id: string | number; [key: string]: unknown };
interface PageState extends Magics {
  root: HTMLElement;
  metric: string;
  pages: PageRow[];
  choose(id: string): void;
  pick(id: string): void;
}

export const webVitalsPage: Register = (Alpine) => {
  Alpine.data("nqWebVitalsPage", (metric: string = "LCP", pages: PageRow[] = []) => ({
    root: null as unknown as HTMLElement,
    metric,
    pages,
    init(this: PageState) {
      this.root = this.$el;
    },
    choose(this: PageState, id: string) {
      if (!id) return;
      this.metric = id;
      this.root.dispatchEvent(new CustomEvent("nq-select", { bubbles: true, detail: { id } }));
    },
    pick(this: PageState, id: string) {
      const row = this.pages.find((r) => String(r.id) === String(id));
      if (row) this.root.dispatchEvent(new CustomEvent("nq-page-click", { bubbles: true, detail: { id: row.id, row } }));
    },
  }));
};
