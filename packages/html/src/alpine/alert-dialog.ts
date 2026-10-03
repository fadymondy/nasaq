// nqAlertDialog: a confirmation that interrupts. The markup is the React AlertDialog's, the state lives here.
//
//   <div x-data="nqAlertDialog()" x-id="['nq-alert-dialog']">
//     <button x-on:click="show()" aria-haspopup="dialog" :aria-expanded="open">Delete project</button>
//     <template x-teleport="body"><div>
//       <div data-slot="alert-dialog-backdrop" x-nq-presence="open" class="… data-starting-style:opacity-0"></div>
//       <div data-slot="alert-dialog-content" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open" class="…">
//         <h2 :id="$id('nq-alert-dialog', 'title')">…</h2>
//         <button autofocus x-on:click="close()">Cancel</button>   <!-- takes initial focus: Enter never destroys -->
//       </div>
//     </div></template>
//   </div>
//
// Unlike nqDialog there is no backdrop-click dismissal: the user picks an answer. Escape still cancels.
// open is x-modelable, so Livewire can drive it: <div x-data="nqAlertDialog()" x-model="$wire.confirming">.

import type { Magics, Register } from "./types";

export interface AlertDialogState {
  open: boolean;
  show(): void;
  close(): void;
  toggle(): void;
}

export const alertDialog: Register = (Alpine) => {
  Alpine.data("nqAlertDialog", (initial = false) => ({
    open: Boolean(initial),
    show() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
    toggle() {
      this.open = !this.open;
    },
    /** Bind on the popup: alertdialog role, labelled by the title and described by the description. */
    popup: {
      role: "alertdialog",
      "aria-modal": "true",
      tabindex: "-1",
      ":aria-labelledby"(this: Magics) {
        return this.$id("nq-alert-dialog", "title");
      },
      ":aria-describedby"(this: Magics) {
        return this.$id("nq-alert-dialog", "description");
      },
      "x-on:keydown.escape.prevent.stop"(this: AlertDialogState) {
        this.close();
      },
    },
  }));
};
