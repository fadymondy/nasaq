// nqPopover: a floating panel anchored to its trigger. The markup is the React Popover one, the state lives here.
//
//   <div x-data="nqPopover()" x-id="['nq-popover']" class="contents">
//     <button x-ref="trigger" x-on:click="toggle()" aria-haspopup="dialog" :aria-expanded="open">Details</button>
//     <template x-teleport="body">
//       <div x-bind="popup" x-init="popupEl = $el" x-anchor.bottom.offset.6="$refs.trigger" x-nq-presence="open" class="... data-starting-style:opacity-0">
//         <h2 :id="$id('nq-popover', 'title')">...</h2>
//       </div>
//     </template>
//   </div>
//
// Closes on Escape and on a click outside, and returns focus to the trigger. open is x-modelable.

import type { Magics, Register } from "./types";

export interface PopoverState extends Magics {
  open: boolean;
  popupEl: HTMLElement | null;
  show(): void;
  close(): void;
  toggle(): void;
}

export const popover: Register = (Alpine) => {
  Alpine.data("nqPopover", (initial = false) => ({
    open: Boolean(initial),
    popupEl: null as HTMLElement | null,
    init(this: PopoverState) {
      this.$watch("open", (open: boolean) => {
        if (open) {
          this.$nextTick(() => this.popupEl?.focus({ preventScroll: true }));
        } else if (this.popupEl?.contains(document.activeElement)) {
          this.$refs.trigger?.focus();
        }
      });
    },
    show(this: PopoverState) {
      this.open = true;
    },
    close(this: PopoverState) {
      this.open = false;
    },
    toggle(this: PopoverState) {
      this.open = !this.open;
    },
    /** Bind on the popup: dialog role, labelled by the title and described by the description. */
    popup: {
      role: "dialog",
      tabindex: "-1",
      ":aria-labelledby"(this: Magics) {
        return this.$id("nq-popover", "title");
      },
      ":aria-describedby"(this: Magics) {
        return this.$id("nq-popover", "description");
      },
      "x-on:keydown.escape.prevent.stop"(this: PopoverState) {
        this.close();
      },
      "x-on:click.outside"(this: PopoverState, event: Event) {
        if (this.open && !this.$refs.trigger?.contains(event.target as Node)) this.close();
      },
    },
  }));
};
