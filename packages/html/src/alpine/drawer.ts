// nqDrawer: a bottom drawer. The same dialog behaviour as nqDialog (open, show, close, popup bind), plus a drag handle:
// dragging it down moves the drawer, and releasing past 30% of its height (or with a quick flick) closes it.
//
//   <div x-data="nqDrawer()" x-id="['nq-dialog']">
//     <button x-on:click="show()">Open drawer</button>
//     <template x-teleport="body"><div>
//       <div data-slot="drawer-backdrop" x-nq-presence="open" x-on:click="close()" class="…"></div>
//       <div data-slot="drawer-content" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open" :data-dragging="dragAttr" :style="shift" class="…">
//         <div data-slot="drawer-handle" x-bind="handle" class="…"></div>
//         <h2 :id="$id('nq-dialog', 'title')">…</h2>
//       </div>
//     </div></template>
//   </div>
//
// open is x-modelable, so Livewire can drive it: <div x-data="nqDrawer()" x-model="$wire.showDrawer">.

import type { Magics, Register } from "./types";

/** Fraction of the height of the drawer that must be dragged before releasing closes it. */
const CLOSE_RATIO = 0.3;
/** A quick flick closes regardless of distance (px per ms). */
const CLOSE_VELOCITY = 0.6;
const SLIDE_OUT_MS = 200;

export interface DrawerState extends Magics {
  open: boolean;
  offset: number;
  dragging: boolean;
  show(): void;
  close(): void;
  toggle(): void;
}

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const drawer: Register = (Alpine) => {
  Alpine.data("nqDrawer", (initial = false) => {
    let drag: { startY: number; lastY: number; lastT: number; velocity: number } | null = null;
    return {
      open: Boolean(initial),
      /** Distance the popup is dragged down, in px. */
      offset: 0,
      dragging: false,
      init(this: DrawerState) {
        // A fresh open starts in place: forget the drag of the previous one.
        this.$watch<boolean>("open", (open) => {
          if (open) this.offset = 0;
        });
      },
      show() {
        this.open = true;
      },
      close() {
        this.open = false;
      },
      toggle() {
        this.open = !this.open;
      },
      /** `data-dragging` for the popup: present while the handle is held. */
      get dragAttr(): string | null {
        return this.dragging ? "" : null;
      },
      /** `style` for the popup: the drag offset, or nothing while it rests. */
      get shift(): string | null {
        return this.offset > 0 || this.dragging ? `translate: 0 ${this.offset}px` : null;
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
        "x-on:keydown.escape.prevent.stop"(this: DrawerState) {
          this.close();
        },
      },
      /** Bind on the drag handle. */
      handle: {
        "x-on:pointerdown"(this: DrawerState, e: PointerEvent) {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          drag = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, velocity: 0 };
          this.dragging = true;
        },
        "x-on:pointermove"(this: DrawerState, e: PointerEvent) {
          if (!drag) return;
          const dt = Math.max(1, e.timeStamp - drag.lastT);
          drag.velocity = (e.clientY - drag.lastY) / dt;
          drag.lastY = e.clientY;
          drag.lastT = e.timeStamp;
          // Only downwards: dragging up past the resting position does nothing.
          this.offset = Math.max(0, e.clientY - drag.startY);
        },
        "x-on:pointerup"(this: DrawerState, e: PointerEvent) {
          finish(this, e, false);
        },
        "x-on:pointercancel"(this: DrawerState, e: PointerEvent) {
          finish(this, e, true);
        },
      },
    };

    function finish(state: DrawerState, e: PointerEvent, cancelled: boolean) {
      const d = drag;
      if (!d) return;
      drag = null;
      const handle = e.currentTarget as HTMLElement;
      if (handle.hasPointerCapture?.(e.pointerId)) handle.releasePointerCapture(e.pointerId);
      state.dragging = false;
      const height = handle.parentElement?.offsetHeight ?? 0;
      const shouldClose = !cancelled && (state.offset > height * CLOSE_RATIO || d.velocity > CLOSE_VELOCITY);
      if (!shouldClose) {
        state.offset = 0; // snap back
        return;
      }
      if (reducedMotion()) {
        state.close();
        return;
      }
      state.offset = height; // slide the rest of the way out, then close
      setTimeout(() => state.close(), SLIDE_OUT_MS);
    }
  });
};
