// nqHealthReport: the period switch, the charted figure, export and retry of a health report. The markup is the React HealthReport's, rendered by
// <x-nq::health-reports>.
//
//   <div x-data="nqHealthReport(30)"> period toggle x-model="selected", figure toggle x-model="metric", <button x-on:click="exportReport()"> </div>
//
// Choosing a period dispatches a bubbling "nq-period-change" ({ days }) from the root; the host loads it and swaps the markup. Clearing the pressed
// period (clicking it again) is undone: one period is always applied. The figure toggle shows one chart panel at a time (x-show on `metric[0]`) and
// likewise always keeps one figure. exportReport() dispatches "nq-export", retry() dispatches "nq-retry".

import type { Magics, Register } from "./types";

interface ReportState extends Magics {
  root: HTMLElement;
  active: number;
  selected: string[];
  metric: string[];
  exportReport(): void;
  retry(): void;
}

export const healthReports: Register = (Alpine) => {
  Alpine.data("nqHealthReport", (active: number) => ({
    root: null as unknown as HTMLElement,
    active,
    selected: [String(active)],
    metric: ["waterMl"],
    init(this: ReportState) {
      this.root = this.$el;
      this.$watch("selected", (value: string[]) => {
        const next = value[0];
        if (next === undefined) {
          this.selected = [String(this.active)];
          return;
        }
        const days = Number(next);
        if (days === this.active) return;
        this.active = days;
        this.root.dispatchEvent(new CustomEvent("nq-period-change", { bubbles: true, detail: { days } }));
      });
      let last = this.metric[0]!;
      this.$watch("metric", (value: string[]) => {
        if (value[0] === undefined) this.metric = [last];
        else last = value[0];
      });
    },
    exportReport(this: ReportState) {
      this.root.dispatchEvent(new CustomEvent("nq-export", { bubbles: true }));
    },
    retry(this: ReportState) {
      this.root.dispatchEvent(new CustomEvent("nq-retry", { bubbles: true }));
    },
  }));
};
