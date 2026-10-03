// nqHoverCard: a rich preview that opens when the pointer rests on (or keyboard focus reaches) its link.
//
//   <div x-data="nqHoverCard(600, 300)" class="contents">
//     <a x-ref="trigger" x-bind="trigger" href="/people/sara">@sara</a>
//     <template x-teleport="body">
//       <div x-bind="popup" x-anchor.bottom.offset.6="$refs.trigger" x-nq-presence="open" class="...">...</div>
//     </template>
//   </div>
//
// It stays open while the pointer is over the card itself. open is x-modelable.

import type { Register } from "./types";

export interface HoverCardState {
  open: boolean;
  delay: number;
  closeDelay: number;
  enter(event?: Event): void;
  leave(event?: Event): void;
  close(): void;
}

const isTouch = (event?: Event) => (event as PointerEvent | undefined)?.pointerType === "touch";

export const hoverCard: Register = (Alpine) => {
  Alpine.data("nqHoverCard", (delay = 600, closeDelay = 300, initial = false) => {
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    return {
      open: Boolean(initial),
      delay,
      closeDelay,
      enter(this: HoverCardState, event?: Event) {
        if (isTouch(event)) return;
        clearTimeout(closeTimer);
        if (this.open) return;
        clearTimeout(openTimer);
        openTimer = setTimeout(() => (this.open = true), this.delay);
      },
      leave(this: HoverCardState, event?: Event) {
        if (isTouch(event)) return;
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => (this.open = false), this.closeDelay);
      },
      close(this: HoverCardState) {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        this.open = false;
      },
      /** Bind on the link. */
      trigger: {
        "x-on:pointerenter"(this: HoverCardState, event: Event) {
          this.enter(event);
        },
        "x-on:pointerleave"(this: HoverCardState, event: Event) {
          this.leave(event);
        },
        "x-on:focus"(this: HoverCardState) {
          this.enter();
        },
        "x-on:blur"(this: HoverCardState) {
          this.leave();
        },
        "x-on:keydown.escape"(this: HoverCardState) {
          this.close();
        },
        ":data-popup-open"(this: HoverCardState) {
          return this.open ? "" : undefined;
        },
      },
      /** Bind on the card. */
      popup: {
        "x-on:pointerenter"(this: HoverCardState, event: Event) {
          if (!isTouch(event)) clearTimeout(closeTimer);
        },
        "x-on:pointerleave"(this: HoverCardState, event: Event) {
          this.leave(event);
        },
        "x-on:keydown.escape.prevent.stop"(this: HoverCardState) {
          this.close();
        },
      },
    };
  });
};
