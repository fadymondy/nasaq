// nqWebVitalsPage: keeps the gauge buttons and the per-metric trend panels of <x-nq::web-vitals-page> on the same metric.
//
//   <div x-data="nqWebVitalsPage('LCP')" x-on:nq-metric="choose($event.detail.id)">
//     <button x-on:click="choose('LCP')" x-bind:aria-pressed="String(metric === 'LCP')">…gauge…</button>
//     <div x-show="metric === 'LCP'">…time series panel for LCP…</div>
//   </div>
//
// Choosing a gauge or switching the chart's own metric switcher (its "nq-metric" event) shows the matching panel and marks the gauge.

import type { Magics, Register } from "./types";

interface PageState extends Magics {
  metric: string;
  choose(id: string): void;
}

export const webVitalsPage: Register = (Alpine) => {
  Alpine.data("nqWebVitalsPage", (metric: string = "LCP") => ({
    metric,
    choose(this: PageState, id: string) {
      if (id) this.metric = id;
    },
  }));
};
