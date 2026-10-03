// nqTooltip: a short label for a focusable trigger. The markup is the React Tooltip one, the state lives here.
//
//   <div x-data="nqTooltip(600)" x-id="['nq-tooltip']" class="contents">
//     <span data-slot="tooltip-trigger" class="contents"><button aria-label="Settings">...</button></span>
//     <template x-teleport="body">
//       <div x-bind="popup" x-anchor.top.offset.6="triggerEl" x-nq-presence="open" class="... data-starting-style:opacity-0">Settings</div>
//     </template>
//   </div>
//
// The first element inside [data-slot="tooltip-trigger"] is the trigger: hover opens after `delay` ms (instantly
// within 300ms of another tooltip closing), keyboard focus opens at once, Escape, blur and leaving close it, and it
// is wired with aria-describedby while open. open is x-modelable.

import type { Magics, Register } from "./types";

export interface TooltipState extends Magics {
  open: boolean;
  delay: number;
  triggerEl: HTMLElement | null;
  show(delay?: number): void;
  hide(): void;
}

let lastClosed = 0;

export const tooltip: Register = (Alpine) => {
  Alpine.data("nqTooltip", (delay = 600, initial = false) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
      open: Boolean(initial),
      delay,
      triggerEl: null as HTMLElement | null,
      init(this: TooltipState) {
        const el = this.$el.querySelector<HTMLElement>('[data-slot="tooltip-trigger"]')?.firstElementChild as HTMLElement | null | undefined;
        if (!el) return;
        this.triggerEl = el;
        const listen = (type: string, fn: (e: Event) => void) => el.addEventListener(type, fn);
        listen("pointerenter", (e) => {
          if ((e as PointerEvent).pointerType !== "touch") this.show();
        });
        listen("pointerleave", () => this.hide());
        listen("pointerdown", () => this.hide());
        listen("focus", () => {
          let visible = true;
          try {
            visible = el.matches(":focus-visible");
          } catch {
            // old engines without :focus-visible: treat every focus as keyboard focus
          }
          if (visible) this.show(0);
        });
        listen("blur", () => this.hide());
        listen("keydown", (e) => (e as KeyboardEvent).key === "Escape" && this.hide());
        this.$watch("open", (open: boolean) => {
          if (open) {
            el.setAttribute("data-popup-open", "");
            el.setAttribute("aria-describedby", this.$id("nq-tooltip", "content"));
          } else {
            el.removeAttribute("data-popup-open");
            el.removeAttribute("aria-describedby");
          }
        });
      },
      show(this: TooltipState, wait?: number) {
        clearTimeout(timer);
        if (this.open) return;
        const ms = wait ?? (Date.now() - lastClosed < 300 ? 0 : this.delay);
        if (!ms) this.open = true;
        else timer = setTimeout(() => (this.open = true), ms);
      },
      hide(this: TooltipState) {
        clearTimeout(timer);
        if (!this.open) return;
        this.open = false;
        lastClosed = Date.now();
      },
      /** Bind on the tooltip: tooltip role, hoverable. */
      popup: {
        role: "tooltip",
        ":id"(this: Magics) {
          return this.$id("nq-tooltip", "content");
        },
        "x-on:pointerenter"(this: TooltipState) {
          this.show(0);
        },
        "x-on:pointerleave"(this: TooltipState) {
          this.hide();
        },
      },
    };
  });
};
