// nqProfileHoverCard: a profile card that opens when the pointer rests on, or keyboard focus reaches, its trigger.
// Like nqHoverCard, plus touch: a tap toggles the card and a tap outside closes it.
//
//   <div x-data="nqProfileHoverCard(300, 150)" class="contents">
//     <button x-ref="trigger" x-bind="trigger">Sara Nasser</button>
//     <template x-teleport="body">
//       <div role="dialog" x-bind="popup" x-anchor.bottom-start.offset.6="$refs.trigger" x-nq-presence="open">…card…</div>
//     </template>
//   </div>

import type { Register } from "./types";

interface ProfileHoverState {
  open: boolean;
  delay: number;
  closeDelay: number;
  enter(event?: Event): void;
  leave(event?: Event): void;
  close(): void;
  $refs: Record<string, HTMLElement>;
  $el: HTMLElement;
}

const isTouch = (event?: Event) => (event as PointerEvent | undefined)?.pointerType === "touch";

export const profileCard: Register = (Alpine) => {
  Alpine.data("nqProfileHoverCard", (delay = 300, closeDelay = 150, initial = false) => {
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    return {
      open: Boolean(initial),
      delay,
      closeDelay,
      enter(this: ProfileHoverState, event?: Event) {
        if (isTouch(event)) return;
        clearTimeout(closeTimer);
        if (this.open) return;
        clearTimeout(openTimer);
        openTimer = setTimeout(() => (this.open = true), this.delay);
      },
      leave(this: ProfileHoverState, event?: Event) {
        if (isTouch(event)) return;
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => (this.open = false), this.closeDelay);
      },
      close(this: ProfileHoverState) {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        this.open = false;
      },
      /** Bind on the trigger. */
      trigger: {
        "x-on:pointerenter"(this: ProfileHoverState, event: Event) {
          this.enter(event);
        },
        "x-on:pointerleave"(this: ProfileHoverState, event: Event) {
          this.leave(event);
        },
        "x-on:focus"(this: ProfileHoverState) {
          this.enter();
        },
        "x-on:blur"(this: ProfileHoverState) {
          this.leave();
        },
        "x-on:keydown.escape"(this: ProfileHoverState) {
          this.close();
        },
        // A touch tap has no hover, so it toggles the card.
        "x-on:pointerup"(this: ProfileHoverState, event: Event) {
          if (!isTouch(event)) return;
          clearTimeout(openTimer);
          clearTimeout(closeTimer);
          this.open = !this.open;
        },
        // A tap outside (touch or mouse) closes it.
        "x-on:pointerdown.document"(this: ProfileHoverState, event: Event) {
          if (!this.open) return;
          const target = event.target as Node | null;
          if (target && (this.$refs.trigger?.contains(target) || target instanceof Element && target.closest('[data-slot="profile-hover-card-content"]'))) return;
          this.close();
        },
        ":aria-expanded"(this: ProfileHoverState) {
          return String(this.open);
        },
        ":data-popup-open"(this: ProfileHoverState) {
          return this.open ? "" : undefined;
        },
      },
      /** Bind on the card. */
      popup: {
        "x-on:pointerenter"(this: ProfileHoverState, event: Event) {
          if (!isTouch(event)) clearTimeout(closeTimer);
        },
        "x-on:pointerleave"(this: ProfileHoverState, event: Event) {
          this.leave(event);
        },
        "x-on:keydown.escape.prevent.stop"(this: ProfileHoverState) {
          this.close();
        },
      },
    };
  });
};
