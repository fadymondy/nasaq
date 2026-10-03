// nqDialog: a modal dialog. The markup is the React Dialog's, the state lives here.
//
//   <div x-data="nqDialog()" x-id="['nq-dialog']">
//     <button x-on:click="show()" aria-haspopup="dialog" :aria-expanded="open">Delete project</button>
//     <template x-teleport="body"><div>
//       <div data-slot="dialog-backdrop" x-nq-presence="open" x-on:click="close()" class="… data-starting-style:opacity-0"></div>
//       <div data-slot="dialog-content" x-bind="popup" x-nq-presence="open" x-trap.noscroll.inert="open" class="…">
//         <h2 :id="$id('nq-dialog', 'title')">…</h2>
//       </div>
//     </div></template>
//   </div>
//
// open is x-modelable, so Livewire can drive it: <div x-data="nqDialog()" x-model="$wire.showDelete">.

import type { Magics, Register } from "./types";

export interface DialogState {
  open: boolean;
  show(): void;
  close(): void;
  toggle(): void;
}

export const dialog: Register = (Alpine) => {
  Alpine.data("nqDialog", (initial = false) => ({
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
    /** Bind on the popup: dialog role, labelled by the title and described by the description. */
    popup: {
      role: "dialog",
      "aria-modal": "true",
      tabindex: "-1",
      ":aria-labelledby"(this: Magics) {
        return this.$id("nq-dialog", "title");
      },
      ":aria-describedby"(this: Magics) {
        return this.$id("nq-dialog", "description");
      },
      "x-on:keydown.escape.prevent.stop"(this: DialogState) {
        this.close();
      },
    },
  }));
};
