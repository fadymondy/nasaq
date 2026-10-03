// nqPricingTable: the Monthly / Yearly switch and the plan buttons of the pricing table. The markup is the React
// PricingTable's (see the Blade component): the cards are rendered by the server with both periods' prices and notes,
// the inactive one hidden by x-show, so switching the period needs no round trip.
//
//   <div data-slot="pricing-table" x-data="nqPricingTable('month')" x-modelable="period">
//     <div x-data="nqToggleGroup(…)" x-model="sel">…</div>      <!-- the switch: an array holding "month" or "year" -->
//     <span x-show="period === 'year'">…</span>                  <!-- a yearly price -->
//     <button :disabled="isBlocked('pro')" @click="select('pro')">…</button>
//   </div>
//
// `period` is month | year and x-modelable (x-model="billing", wire:model). Every change dispatches the bubbling
// `nq-period-change` with { period }. A plan button dispatches the bubbling `nq-plan-select` with
// { planId, period, wait(promise) }: call event.detail.wait(promise) to keep the buttons busy (disabled, aria-busy on the
// chosen plan) until the promise settles, e.g. a checkout redirect. While one is pending the others are blocked.

import type { Magics, Register } from "./types";

type Period = "month" | "year";

interface PricingTableState extends Magics {
  period: Period;
  sel: Period[];
  pending: string | null;
  isBlocked(planId: string): boolean;
  select(planId: string): void;
}

export const pricingTable: Register = (Alpine) => {
  Alpine.data("nqPricingTable", (initial: Period = "month") => ({
    period: (initial === "year" ? "year" : "month") as Period,
    sel: [(initial === "year" ? "year" : "month") as Period],
    pending: null as string | null,
    init(this: PricingTableState) {
      // The switch's toggle group holds an array; pressing the pressed item clears it, so keep the current period then.
      this.$watch<Period[]>("sel", (value) => {
        const next = value?.[0];
        if (next === "month" || next === "year") {
          if (next !== this.period) this.period = next;
        } else {
          this.sel = [this.period];
        }
      });
      this.$watch<Period>("period", (value) => {
        if (value !== "month" && value !== "year") return;
        if (this.sel[0] !== value) this.sel = [value];
        this.$dispatch("nq-period-change", { period: value });
      });
    },
    isBlocked(this: PricingTableState, planId: string): boolean {
      void planId;
      return this.pending !== null;
    },
    select(this: PricingTableState, planId: string) {
      if (this.pending !== null) return;
      const waits: Promise<unknown>[] = [];
      this.$dispatch("nq-plan-select", { planId, period: this.period, wait: (p: Promise<unknown>) => waits.push(Promise.resolve(p)) });
      if (!waits.length) return;
      this.pending = planId;
      void Promise.allSettled(waits).then(() => {
        this.pending = null;
      });
    },
  }));
};
