// nqChipGroup: a single-select row of filter chips. The markup is the React ChipGroup's, the state lives here.
//
//   <div role="group" aria-label="Categories" x-data="nqChipGroup('all')" x-modelable="value">
//     <button data-slot="chip" x-on:click="select('all')" x-bind:aria-pressed="String(value === 'all')"
//             x-bind:data-selected="value === 'all' ? '' : null">All</button>
//   </div>
//
// value is x-modelable: x-model="$wire.category" keeps Livewire in step. Selecting fires `nq:change` ({ value }).

import type { Magics, Register } from "./types";

interface ChipGroupState extends Magics {
  value: string | null;
  select(value: string): void;
}

export const chipGroup: Register = (Alpine) => {
  Alpine.data("nqChipGroup", (initial: string | null = null) => ({
    value: initial,
    select(this: ChipGroupState, value: string) {
      if (this.value === value) return;
      this.value = value;
      this.$dispatch("nq:change", { value });
    },
  }));
};
