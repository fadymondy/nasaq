// nqPluginCard: the selectable behaviour of the plugin card. The markup is the Blade plugin-card component with `selectable`.
//
//   <article x-data="nqPluginCard(false)" x-modelable="selected" x-bind="root"> <x-nq::checkbox x-model="selected" /> ... </article>
//
// Clicking the card toggles `selected` (clicks on links, buttons, inputs, labels and the checkbox are left alone). On touch, a
// 500 ms press selects it; the click that follows the press is swallowed. `selected` is x-modelable and fires `nq-change { selected }`.

import type { Magics, Register } from "./types";

const LONG_PRESS_MS = 500;
const INTERACTIVE = "a, button, input, label, [role='checkbox'], [role='button']";

interface CardState extends Magics {
  selected: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  pressed: boolean;
  cancelPress(): void;
}

export const pluginCard: Register = (Alpine) => {
  Alpine.data("nqPluginCard", (initial = false) => ({
    selected: !!initial,
    timer: null as ReturnType<typeof setTimeout> | null,
    pressed: false,
    init(this: CardState) {
      this.$watch("selected", (value: boolean) => {
        this.$dispatch("nq-change", { selected: !!value });
      });
    },
    destroy(this: CardState) {
      this.cancelPress();
    },
    cancelPress(this: CardState) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
    },
    root: {
      ["x-bind:data-selected"](this: CardState) {
        return this.selected ? "true" : null;
      },
      ["x-bind:class"](this: CardState) {
        return { "border-primary bg-nq-selected": this.selected, "border-border": !this.selected };
      },
      ["@click"](this: CardState, e: MouseEvent) {
        if (e.defaultPrevented) return;
        if (this.pressed) {
          this.pressed = false;
          return;
        }
        if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
        this.selected = !this.selected;
      },
      ["@pointerdown"](this: CardState, e: PointerEvent) {
        if (e.pointerType === "mouse" || this.selected) return;
        this.cancelPress();
        this.timer = setTimeout(() => {
          this.pressed = true;
          this.selected = true;
        }, LONG_PRESS_MS);
      },
      ["@pointerup"](this: CardState) {
        this.cancelPress();
      },
      ["@pointerleave"](this: CardState) {
        this.cancelPress();
      },
      ["@pointercancel"](this: CardState) {
        this.cancelPress();
      },
    },
  }));
};
