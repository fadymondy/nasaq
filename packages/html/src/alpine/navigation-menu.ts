// nqNavigationMenu: a site header menu with mega-menu panels. The markup is the React NavigationMenu's, the
// state lives here.
//
//   <nav x-data="nqNavigationMenu()" x-bind="root">
//     <ul x-bind="list">
//       <li class="relative">
//         <button x-bind="trigger('res')" class="… data-popup-open:bg-nq-selected">Resources</button>
//         <div x-bind="content('res')" x-nq-presence="value === 'res'" class="absolute … data-starting-style:opacity-0">…</div>
//       </li>
//     </ul>
//   </nav>
//
// One panel is open at a time. A trigger opens on click, Enter, Space or ArrowDown, and on hover for a mouse; the
// pointer leaving the bar, a click outside, focus leaving, or Escape closes it (Escape returns focus to the
// trigger). ArrowLeft and ArrowRight move between the bar's triggers and links in reading order (flipped in
// RTL), Home and End jump. Open items carry data-popup-open and aria-expanded, like Base UI.
// value is x-modelable: <nav x-data="nqNavigationMenu()" x-model="$wire.menu">.

import type { Magics, Register } from "./types";

export interface NavigationMenuState extends Magics {
  value: string | null;
  show(value: string): void;
  close(returnFocus?: boolean): void;
  toggle(value: string): void;
}

const BAR_ITEMS = '[data-slot="navigation-menu-trigger"], [data-slot="navigation-menu-link"]';

function barItems(list: Element): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>(BAR_ITEMS)].filter(
    (el) => !el.closest('[data-slot="navigation-menu-content"]') && !el.hasAttribute("disabled"),
  );
}

export const navigationMenu: Register = (Alpine) => {
  Alpine.data("nqNavigationMenu", (initial: string | null = null, hoverDelay = 120) => {
    let leaveTimer: ReturnType<typeof setTimeout> | undefined;
    return {
      value: initial,
      show(this: NavigationMenuState, value: string) {
        clearTimeout(leaveTimer);
        this.value = value;
      },
      close(this: NavigationMenuState, returnFocus = false) {
        clearTimeout(leaveTimer);
        const was = this.value;
        this.value = null;
        if (returnFocus && was) this.$el.querySelector<HTMLElement>(`[data-nq-nav-trigger="${was}"]`)?.focus();
      },
      toggle(this: NavigationMenuState, value: string) {
        if (this.value === value) this.close();
        else this.show(value);
      },
      /** Bind on the root <nav>. */
      root: {
        "x-modelable": "value",
        "x-on:keydown.escape"(this: NavigationMenuState) {
          if (this.value) this.close(true);
        },
        "x-on:click.document"(this: NavigationMenuState, event: MouseEvent) {
          if (this.value && !this.$el.contains(event.target as Node)) this.close();
        },
        "x-on:focusout"(this: NavigationMenuState, event: FocusEvent) {
          const to = event.relatedTarget as Node | null;
          if (to && !this.$el.contains(to)) this.close();
        },
        "x-on:mouseleave"(this: NavigationMenuState) {
          if (!this.value) return;
          clearTimeout(leaveTimer);
          leaveTimer = setTimeout(() => this.close(), hoverDelay);
        },
        "x-on:mouseenter"() {
          clearTimeout(leaveTimer);
        },
      },
      /** Bind on the <ul> in the bar: arrow keys move across the triggers and links. */
      list: {
        "x-on:keydown"(this: NavigationMenuState, event: KeyboardEvent) {
          const target = event.target as HTMLElement;
          if (target.closest('[data-slot="navigation-menu-content"]')) return;
          const list = event.currentTarget as HTMLElement;
          const items = barItems(list);
          const at = items.indexOf(target);
          if (at < 0) return;
          const rtl = getComputedStyle(list).direction === "rtl";
          const next = rtl ? "ArrowLeft" : "ArrowRight";
          const prev = rtl ? "ArrowRight" : "ArrowLeft";
          let to = -1;
          if (event.key === next) to = (at + 1) % items.length;
          else if (event.key === prev) to = (at - 1 + items.length) % items.length;
          else if (event.key === "Home") to = 0;
          else if (event.key === "End") to = items.length - 1;
          if (to < 0) return;
          event.preventDefault();
          items[to]!.focus();
        },
      },
      /** Bind on one trigger; give it the same value as its content. */
      trigger(this: NavigationMenuState, value: string) {
        return {
          type: "button",
          "data-nq-nav-trigger": value,
          "aria-haspopup": "true",
          ":aria-expanded"(this: NavigationMenuState) {
            return String(this.value === value);
          },
          ":data-popup-open"(this: NavigationMenuState) {
            return this.value === value ? "" : undefined;
          },
          "x-on:click"(this: NavigationMenuState) {
            this.toggle(value);
          },
          "x-on:pointerenter"(this: NavigationMenuState, event: PointerEvent) {
            if (event.pointerType === "mouse") this.show(value);
          },
          "x-on:keydown.arrow-down.prevent"(this: NavigationMenuState, event: KeyboardEvent) {
            this.show(value);
            const trigger = event.currentTarget as HTMLElement;
            this.$nextTick(() => {
              const panel = trigger.parentElement?.querySelector<HTMLElement>('[data-slot="navigation-menu-content"]');
              panel?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
            });
          },
        };
      },
      /** Bind on the panel of one trigger. */
      content(this: NavigationMenuState, value: string) {
        return {
          "data-nq-nav-content": value,
          "x-on:click"(this: NavigationMenuState, event: MouseEvent) {
            if ((event.target as HTMLElement).closest("a[href]")) this.close();
          },
        };
      },
    };
  });
};
