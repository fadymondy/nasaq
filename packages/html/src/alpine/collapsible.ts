// nqCollapsible: a disclosure. The markup is the React Collapsible one, the state lives here.
//
//   <div x-data="nqCollapsible()" x-id="['nq-collapsible']" x-modelable="open">
//     <button x-on:click="toggle()" :aria-expanded="open" :aria-controls="$id('nq-collapsible', 'panel')">Advanced</button>
//     <div x-ref="panel" x-nq-presence="open" :id="$id('nq-collapsible', 'panel')"
//          class="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] data-starting-style:h-0 data-ending-style:h-0">...</div>
//   </div>
//
// The runtime measures the panel into --collapsible-panel-height so the height animates, like Base UI does.
// open is x-modelable: <div x-data="nqCollapsible()" x-model="$wire.showAdvanced">.

import type { Magics, Register } from "./types";

export interface CollapsibleState extends Magics {
  open: boolean;
  show(): void;
  close(): void;
  toggle(): void;
  measure(): void;
}

export const collapsible: Register = (Alpine) => {
  Alpine.data("nqCollapsible", (initial = false) => ({
    open: Boolean(initial),
    init(this: CollapsibleState) {
      // The panel is displayed (starting from h-0) by the presence directive; measure once that has happened.
      this.$watch("open", (open: boolean) => {
        if (open) this.$nextTick(() => this.measure());
      });
    },
    /** Puts the natural height of the panel on --collapsible-panel-height. */
    measure(this: CollapsibleState) {
      const panel = this.$refs.panel;
      if (panel) panel.style.setProperty("--collapsible-panel-height", `${panel.scrollHeight}px`);
    },
    show(this: CollapsibleState) {
      this.open = true;
    },
    close(this: CollapsibleState) {
      this.measure();
      this.open = false;
    },
    toggle(this: CollapsibleState) {
      if (this.open) this.close();
      else this.show();
    },
  }));
};
