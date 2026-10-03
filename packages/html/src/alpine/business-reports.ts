// nqPipelineReport: the chart/table switch of the pipeline report. The other business reports have no behaviour of their own: their tables are
// the data-table and their menus the context-menu.
//
//   <section x-data="nqPipelineReport('chart')">
//     <div x-nq-toggle-group x-model="view">…</div>      view is an array, as a toggle group's value is
//     <div x-show="current === 'chart'">funnel</div>  <div x-show="current === 'table'">table</div>
//   </section>
//
// Switching dispatches a bubbling "nq-view" ({ view: "chart" | "table" }). Pressing the pressed toggle clears the group; the view then stays as it was.

import type { Register } from "./types";

type View = "chart" | "table";

interface PipelineState {
  view: string[];
  current: View;
  $watch(prop: string, cb: (v: string[]) => void): void;
  $dispatch(name: string, detail?: unknown): void;
}

export const businessReports: Register = (Alpine) => {
  Alpine.data("nqPipelineReport", (initial: View = "chart") => ({
    view: [initial] as string[],
    current: initial as View,
    init(this: PipelineState) {
      this.$watch("view", (v: string[]) => {
        const next = v[0] as View | undefined;
        if (next !== "chart" && next !== "table") {
          // Cleared by pressing the pressed toggle: put the current view back.
          this.view = [this.current];
          return;
        }
        if (next === this.current) return;
        this.current = next;
        this.$dispatch("nq-view", { view: next });
      });
    },
  }));
};
