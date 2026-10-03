// nqAlert: a dismissible inline notice. The markup is the React Alert's; the host hides it, here the runtime does.
//
//   <div x-data="nqAlert()" x-show="open" role="alert" data-slot="alert" class="…">
//     …
//     <button type="button" aria-label="Dismiss" x-on:click="dismiss()">…</button>
//   </div>
//
// Dismissing hides the alert and fires a bubbling `nq:dismiss` event: <div @nq:dismiss="…">.
// open is x-modelable: x-model="$wire.showNotice" keeps Livewire in step.

import type { Magics, Register } from "./types";

export interface AlertState extends Magics {
  open: boolean;
  dismiss(): void;
  show(): void;
}

export const alert: Register = (Alpine) => {
  Alpine.data("nqAlert", (initial = true) => ({
    open: Boolean(initial),
    dismiss(this: AlertState) {
      this.open = false;
      this.$dispatch("nq:dismiss");
    },
    show(this: AlertState) {
      this.open = true;
    },
  }));
};
