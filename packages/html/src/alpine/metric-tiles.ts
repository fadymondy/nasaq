// nqMetricTiles: the single-choice selection of selectable metric tiles. The markup is the React MetricTiles', rendered by <x-nq::metric-tiles selectable>.
//
//   <div x-data="nqMetricTiles('clicks')"> <button x-on:click="select('users')" x-bind:aria-pressed="selected === 'users'">…</button> </div>
//
// select(id) marks the tile and dispatches a bubbling "nq-select" ({ id }) from the root, so the host can switch the chart the tiles drive.

import type { Magics, Register } from "./types";

interface TilesState extends Magics {
  root: HTMLElement;
  selected: string | null;
  select(id: string): void;
}

export const metricTiles: Register = (Alpine) => {
  Alpine.data("nqMetricTiles", (selected: string | null = null) => ({
    root: null as unknown as HTMLElement,
    selected,
    init(this: TilesState) {
      this.root = this.$el;
    },
    select(this: TilesState, id: string) {
      this.selected = id;
      this.root.dispatchEvent(new CustomEvent("nq-select", { bubbles: true, detail: { id } }));
    },
  }));
};
