// nqTimeSeriesPanel and nqTimeSeriesChart: the metric switcher, the compare switch and the hover of <x-nq::time-series-panel>.
// The markup is the React TimeSeriesPanel's (the chart is hand-drawn SVG), rendered by Blade with one block per metric.
//
//   <div x-data="nqTimeSeriesPanel('users', true)">
//     <div x-data="nqToggleGroup(['users'])" x-model="pressed">…</div>      the metric toggle (never empty)
//     <button role="switch" x-model="compare">…</button>                       the comparison line and the change
//     <div class="contents" x-show="metric === 'users'">
//       <div data-slot="time-series-plot" x-data="nqTimeSeriesChart([{ x, y, date, rows }])" x-on:pointermove="move($event)" x-on:pointerleave="leave()">…</div>
//     </div>
//   </div>
//
// The root dispatches a bubbling "nq-metric" ({ id }) and "nq-compare" ({ on }) when the user changes them.
// The chart's tips are one per point: x and y in percent of the plot, the formatted date and the series rows of the tooltip.

import type { Magics, Register } from "./types";

interface PanelState extends Magics {
  root: HTMLElement;
  metric: string;
  compare: boolean;
  pressed: string[];
}

interface Tip {
  x: number;
  y: number;
  date: string;
  rows: { k: string; label: string; color: string; text: string }[];
}

interface ChartState {
  tips: Tip[];
  hover: number | null;
  tip: Tip;
}

export const timeSeriesPanel: Register = (Alpine) => {
  Alpine.data("nqTimeSeriesPanel", (metric: string = "", compare: boolean = true) => ({
    root: null as unknown as HTMLElement,
    metric,
    compare: Boolean(compare),
    pressed: [metric],
    init(this: PanelState) {
      this.root = this.$el;
      this.$watch("pressed", (v: string[]) => {
        // The metric toggle is a segmented control: pressing the pressed one must not leave it empty.
        if (!v || v.length === 0) {
          this.pressed = [this.metric];
          return;
        }
        const next = String(v[0]);
        if (next === this.metric) return;
        this.metric = next;
        this.root.dispatchEvent(new CustomEvent("nq-metric", { bubbles: true, detail: { id: next } }));
      });
      this.$watch("compare", (on: boolean) => {
        this.root.dispatchEvent(new CustomEvent("nq-compare", { bubbles: true, detail: { on: Boolean(on) } }));
      });
    },
  }));

  Alpine.data("nqTimeSeriesChart", (tips: Tip[] = []) => ({
    tips,
    hover: null as number | null,
    get tip(): Tip {
      return (this as unknown as ChartState).tips[(this as unknown as ChartState).hover ?? 0] ?? { x: 0, y: 0, date: "", rows: [] };
    },
    /** The vertical hairline at the hovered point. */
    get lineStyle() {
      return { "inset-inline-start": `${this.tip.x}%` };
    },
    /** The dot on the current line. */
    get dotStyle() {
      return { "inset-inline-start": `${this.tip.x}%`, top: `${this.tip.y}%` };
    },
    /** The tooltip, kept inside the plot at both ends. */
    get tipStyle() {
      return { "inset-inline-start": `${Math.min(85, Math.max(15, this.tip.x))}%` };
    },
    move(this: ChartState & Magics, event: PointerEvent) {
      const box = this.$el.getBoundingClientRect();
      if (!box.width || !this.tips.length) return;
      let f = (event.clientX - box.left) / box.width;
      if (getComputedStyle(this.$el).direction === "rtl") f = 1 - f;
      this.hover = Math.min(this.tips.length - 1, Math.max(0, Math.round(f * (this.tips.length - 1))));
    },
    leave(this: ChartState) {
      this.hover = null;
    },
  }));
};
