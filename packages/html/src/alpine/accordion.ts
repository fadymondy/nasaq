// nqAccordion: stacked disclosure sections. The markup is the React Accordion's, the state lives here.
//
//   <div x-data="nqAccordion(['plan'], false)" x-id="['nq-accordion']" x-modelable="value" class="flex w-full flex-col rounded-card border …">
//     <div x-data="{ v: 'plan' }" :data-open="isOpen(v) ? '' : undefined" class="border-b …">
//       <h3 class="m-0 flex"><button x-on:click="toggle(v)" :aria-expanded="isOpen(v)" :data-panel-open="isOpen(v) ? '' : undefined"
//           :id="$id('nq-accordion', 'trigger-' + v)" :aria-controls="$id('nq-accordion', 'panel-' + v)" class="group …">Plan?</button></h3>
//       <div role="region" x-nq-presence="isOpen(v)" :id="$id('nq-accordion', 'panel-' + v)" :aria-labelledby="$id('nq-accordion', 'trigger-' + v)"
//            class="h-(--accordion-panel-height) overflow-hidden transition-[height,opacity] data-starting-style:h-0 data-ending-style:h-0">…</div>
//     </div>
//   </div>
//
// value is the array of open item values (always an array, as in React) and is x-modelable. Without `multiple`
// opening one item closes the others. ArrowUp/ArrowDown/Home/End move focus between the triggers (looping).
// The runtime measures each panel into --accordion-panel-height so the height animates, like Base UI does.

import type { Magics, Register } from "./types";

export interface AccordionState extends Magics {
  value: string[];
  multiple: boolean;
  isOpen(v: string): boolean;
  toggle(v: string): void;
  measure(): void;
}

export const accordion: Register = (Alpine) => {
  Alpine.data("nqAccordion", (initial: string[] = [], multiple = false) => ({
    value: multiple ? [...initial] : initial.slice(0, 1),
    multiple: Boolean(multiple),
    init(this: AccordionState) {
      this.$watch("value", () => this.$nextTick(() => this.measure()));
      this.$nextTick(() => this.measure());
    },
    isOpen(this: AccordionState, v: string) {
      return this.value.includes(v);
    },
    /** Puts each displayed panel's natural height on --accordion-panel-height. */
    measure(this: AccordionState) {
      for (const panel of this.$el.querySelectorAll<HTMLElement>('[data-slot="accordion-panel"]')) {
        if (panel.style.display !== "none") panel.style.setProperty("--accordion-panel-height", `${panel.scrollHeight}px`);
      }
    },
    toggle(this: AccordionState, v: string) {
      // A closing panel is measured while it still has its height, so it can animate down from it.
      this.measure();
      if (this.isOpen(v)) this.value = this.value.filter((x) => x !== v);
      else this.value = this.multiple ? [...this.value, v] : [v];
    },
    onKeydown(this: AccordionState, event: KeyboardEvent) {
      const current = (event.target as HTMLElement).closest<HTMLElement>('[data-slot="accordion-trigger"]');
      if (!current) return;
      const triggers = [...this.$el.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]')].filter((t) => !t.hasAttribute("disabled"));
      const at = triggers.indexOf(current);
      let to = -1;
      if (event.key === "ArrowDown") to = (at + 1) % triggers.length;
      else if (event.key === "ArrowUp") to = (at - 1 + triggers.length) % triggers.length;
      else if (event.key === "Home") to = 0;
      else if (event.key === "End") to = triggers.length - 1;
      if (to < 0 || !triggers.length) return;
      event.preventDefault();
      triggers[to]!.focus();
    },
  }));
};
