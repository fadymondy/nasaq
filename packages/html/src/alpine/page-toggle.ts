// nqPageToggle: turns a toggle group's value into a bubbling change event, so a page can tell its host which period or device was chosen.
//
//   <div class="contents" x-data="nqPageToggle(['28'], 'nq-period-change', 'period', true)">
//     <div x-data="nqToggleGroup(['28'])" x-modelable="value" x-model="choice">…toggles…</div>
//   </div>
//
// The wrapper owns `choice` (an array, as the toggle group's). When it changes, "<event>" bubbles from the wrapper with { [key]: value }, the value
// as a number when `numeric`. Like React's controlled ToggleGroup, pressing the pressed item (an empty value) changes nothing: the choice is put back.

import type { Magics, Register } from "./types";

interface ToggleState extends Magics {
  root: HTMLElement;
  choice: string[];
  last: string;
  event: string;
  key: string;
  numeric: boolean;
}

export const pageToggle: Register = (Alpine) => {
  Alpine.data("nqPageToggle", (initial: string[] = [], event: string = "nq-change", key: string = "value", numeric: boolean = false) => ({
    root: null as unknown as HTMLElement,
    choice: [...(initial ?? [])].map(String),
    last: String(initial?.[0] ?? ""),
    event,
    key,
    numeric: Boolean(numeric),
    init(this: ToggleState) {
      this.root = this.$el;
      this.$watch("choice", (value: string[]) => {
        const next = value?.[0];
        if (next === undefined) {
          if (this.last) this.choice = [this.last];
          return;
        }
        if (next === this.last) return;
        this.last = next;
        this.root.dispatchEvent(new CustomEvent(this.event, { bubbles: true, detail: { [this.key]: this.numeric ? Number(next) : next } }));
      });
    },
  }));
};
