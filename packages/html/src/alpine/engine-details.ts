// nqEngineDetails: the history window switch and retry of an engine details page. The markup is the React EngineDetails', rendered by <x-nq::engine-details>.
//
//   <div x-data="nqEngineDetails(30)"> <x-nq::toggle-group x-model="selected">…</x-nq::toggle-group> <button x-on:click="retry()">…</button> </div>
//
// Choosing a window dispatches a bubbling "nq-window-change" ({ days }) from the root; the host loads that window and swaps the markup. Clearing the
// pressed window (clicking it again) is undone: one window is always applied. retry() dispatches "nq-retry".

import type { Magics, Register } from "./types";

interface DetailsState extends Magics {
  root: HTMLElement;
  active: number;
  selected: string[];
  retry(): void;
}

export const engineDetails: Register = (Alpine) => {
  Alpine.data("nqEngineDetails", (active: number) => ({
    root: null as unknown as HTMLElement,
    active,
    selected: [String(active)],
    init(this: DetailsState) {
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
        this.root.dispatchEvent(new CustomEvent("nq-window-change", { bubbles: true, detail: { days } }));
      });
    },
    retry(this: DetailsState) {
      this.root.dispatchEvent(new CustomEvent("nq-retry", { bubbles: true }));
    },
  }));
};
