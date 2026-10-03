// nqDailySummary: the day switcher and retry of a daily summary. The markup is the React DailySummary's, rendered by <x-nq::daily-summary>.
//
//   <section x-data="nqDailySummary" data-date="2026-09-29"> <button x-on:click="step(-1)">…</button> <button x-on:click="retry()">…</button> </section>
//
// step(±1) dispatches a bubbling "nq-date-change" ({ date }) from the root with the neighbouring civil date, read from data-date at the time
// of the click, so a host that swaps the markup (Livewire, htmx) needs no state to keep in sync. retry() dispatches "nq-retry".

import { addCivilDays } from "./daily-summary-logic";
import type { Magics, Register } from "./types";

interface SummaryState extends Magics {
  root: HTMLElement;
  step(delta: number): void;
  retry(): void;
}

export const dailySummary: Register = (Alpine) => {
  Alpine.data("nqDailySummary", () => ({
    root: null as unknown as HTMLElement,
    init(this: SummaryState) {
      this.root = this.$el;
    },
    step(this: SummaryState, delta: number) {
      const date = this.root.dataset.date;
      if (!date) return;
      this.root.dispatchEvent(new CustomEvent("nq-date-change", { bubbles: true, detail: { date: addCivilDays(date, delta) } }));
    },
    retry(this: SummaryState) {
      this.root.dispatchEvent(new CustomEvent("nq-retry", { bubbles: true }));
    },
  }));
};
