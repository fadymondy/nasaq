// nqBreakdownTable: the "Show all" / "Show fewer" of <x-nq::breakdown-table>. The markup is the React BreakdownTable's.
//
//   <div x-data="nqBreakdownTable">
//     <tr x-show="all" style="display: none">…</tr>                                  rows beyond the limit
//     <button x-on:click="all = ! all" x-bind:aria-expanded="String(all)"><span x-text="all ? 'Show fewer' : 'Show all 10'">Show all 10</span></button>
//   </div>

import type { Register } from "./types";

export const breakdownTable: Register = (Alpine) => {
  Alpine.data("nqBreakdownTable", (open: boolean = false) => ({
    all: Boolean(open),
  }));
};
