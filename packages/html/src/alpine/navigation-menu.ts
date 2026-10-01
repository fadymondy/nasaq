// nqNavigationMenu: a site header menu with mega-menu panels. The markup is the React NavigationMenu's, the
// state lives here.
//
//   <nav x-data="nqNavigationMenu()" x-bind="root">
//     <ul x-bind="list"><li><button x-bind="trigger('res')">Resources</button>
//         <div x-bind="content('res')" style="display: none" class="… data-starting-style:opacity-0">…</div></li></ul>
//     <div data-slot="navigation-menu-positioner" style="display: none">                  (the one shared panel)
//       <div data-slot="navigation-menu-popup"><div data-slot="navigation-menu-viewport"></div></div>
//     </div>
//   </nav>
//
// One shared popup sits under the bar, like Base UI's Positioner > Popup > Viewport. Each item's content is moved
// into the viewport while it is the open one and back home when it has left. The popup measures the open content
// and publishes --popup-width / --popup-height (and --positioner-width / --positioner-height) so it grows and
// shrinks between triggers; the positioner follows the active trigger (the inset transition). Content slides with
// data-starting-style / data-ending-style and data-activation-direction="left|right", the side the incoming panel
// comes from, which the React classes translate on. Closing animates the popup out (data-ending-style).
//
// One panel is open at a time. A trigger opens on click, Enter, Space or ArrowDown, and on hover for a mouse; the
// pointer leaving the bar, a click outside, focus leaving, or Escape closes it (Escape returns focus to the
// trigger). ArrowLeft and ArrowRight move between the bar's triggers and links in reading order (flipped in
// RTL), Home and End jump. Open items carry data-popup-open and aria-expanded, like Base UI.
// value is x-modelable: <nav x-data="nqNavigationMenu()" x-model="$wire.menu">.

import { afterTransition, setPresence } from "./presence";
import type { Magics, Register } from "./types";

export interface NavigationMenuState extends Magics {
  value: string | null;
  show(value: string): void;
  close(returnFocus?: boolean): void;
  toggle(value: string): void;
}

type Panel = HTMLElement & { _nqHome?: HTMLElement };

const BAR_ITEMS = '[data-slot="navigation-menu-trigger"], [data-slot="navigation-menu-link"]';
const BORDER = 2; // the popup's 1px border on both sides

function barItems(list: Element): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>(BAR_ITEMS)].filter(
    (el) => !el.closest('[data-slot="navigation-menu-content"]') && !el.hasAttribute("disabled"),
  );
}

export const navigationMenu: Register = (Alpine) => {
  Alpine.data("nqNavigationMenu", (initial: string | null = null, hoverDelay = 120) => {
    let leaveTimer: ReturnType<typeof setTimeout> | undefined;
    let root: HTMLElement;
    let current: string | null = null; // the value the shared popup shows
    let observer: ResizeObserver | undefined;
    const cancellers = new WeakMap<HTMLElement, () => void>();

    const part = (slot: string) => root.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
    const contentOf = (value: string | null) =>
      value ? root.querySelector<Panel>(`[data-nq-nav-content="${CSS.escape(value)}"]`) : null;
    const triggerOf = (value: string | null) =>
      value ? root.querySelector<HTMLElement>(`[data-nq-nav-trigger="${CSS.escape(value)}"]`) : null;
    const isRtl = () => getComputedStyle(root).direction === "rtl";

    /** Runs one cancellable animation per element; starting a new one cancels the old. */
    function run(el: HTMLElement, cancel: () => void) {
      cancellers.get(el)?.();
      cancellers.set(el, cancel);
    }

    // The natural size of a content element (it is w-max h-full), measured with its height released.
    function measure(el: HTMLElement) {
      const keep = el.style.height;
      el.style.height = "auto";
      const size = { width: el.offsetWidth, height: el.offsetHeight };
      el.style.height = keep;
      return size;
    }

    function layout(value: string) {
      const positioner = part("navigation-menu-positioner");
      const popup = part("navigation-menu-popup");
      const el = contentOf(value);
      if (!positioner || !popup || !el) return;
      const { width, height } = measure(el);
      const w = `${width + BORDER}px`;
      const h = `${height + BORDER}px`;
      popup.style.setProperty("--popup-width", w);
      popup.style.setProperty("--popup-height", h);
      positioner.style.setProperty("--positioner-width", w);
      positioner.style.setProperty("--positioner-height", h);
      // Follow the active trigger: align against its inline start (start), centre or inline end.
      const trigger = triggerOf(value);
      if (!trigger) return;
      const nav = root.getBoundingClientRect();
      const rect = trigger.getBoundingClientRect();
      const align = root.getAttribute("data-align") || "start";
      const size = width + BORDER;
      let left = rect.left - nav.left;
      if (align === "center") left += (rect.width - size) / 2;
      else if ((align === "start") === isRtl()) left += rect.width - size; // the panel's right edge meets the trigger's
      // Collision padding of 16px against the viewport.
      const view = document.documentElement.clientWidth;
      if (view) left = Math.max(16 - nav.left, Math.min(left, view - 16 - nav.left - size));
      positioner.style.left = `${Math.round(left)}px`;
    }

    /** The side the incoming panel comes from: later triggers are on the right in LTR, on the left in RTL. */
    function direction(next: string, prev: string): "left" | "right" {
      const order = [...root.querySelectorAll<HTMLElement>("[data-nq-nav-trigger]")].map((t) => t.getAttribute("data-nq-nav-trigger"));
      return (order.indexOf(next) > order.indexOf(prev)) !== isRtl() ? "right" : "left";
    }

    function leave(el: Panel, dir: string | null) {
      if (dir) el.setAttribute("data-activation-direction", dir);
      // The outgoing panel leaves the flow so the incoming one sizes the viewport.
      el.style.position = "absolute";
      el.style.insetBlockStart = "0";
      el.style.insetInlineStart = "0";
      const stopPresence = setPresence(el, false);
      const stopAfter = afterTransition(el, () => {
        el.style.removeProperty("position");
        el.style.removeProperty("inset-block-start");
        el.style.removeProperty("inset-inline-start");
        el.removeAttribute("data-activation-direction");
        if (el._nqHome && el.parentElement !== el._nqHome) el._nqHome.appendChild(el);
      });
      run(el, () => {
        stopPresence();
        stopAfter();
      });
    }

    function sync(next: string | null, prev: string | null, animate: boolean) {
      const positioner = part("navigation-menu-positioner");
      const popup = part("navigation-menu-popup");
      const viewport = part("navigation-menu-viewport");
      if (!positioner || !popup || !viewport) return;
      observer?.disconnect();
      const out = contentOf(prev);
      const into = contentOf(next);
      current = next;

      if (out && out !== into) leave(out, next && prev ? direction(next, prev) : null);

      if (into) {
        if (!into._nqHome && into.parentElement !== viewport) into._nqHome = into.parentElement as HTMLElement;
        if (into.parentElement !== viewport) viewport.appendChild(into);
        into.style.removeProperty("position");
        into.style.removeProperty("inset-block-start");
        into.style.removeProperty("inset-inline-start");
        if (next && prev && out && out !== into) into.setAttribute("data-activation-direction", direction(next, prev));
        else into.removeAttribute("data-activation-direction");
        run(into, setPresence(into, true, animate));
        positioner.style.removeProperty("display");
        layout(next as string);
        if (!popup.hasAttribute("data-open")) run(popup, setPresence(popup, true, animate));
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => current === next && layout(next as string));
          observer.observe(into);
        }
        return;
      }

      if (out) {
        const stopPresence = setPresence(popup, false, animate);
        const stopAfter = afterTransition(popup, () => {
          if (!current) positioner.style.display = "none";
        });
        run(popup, () => {
          stopPresence();
          stopAfter();
        });
      }
    }

    return {
      value: initial,
      init(this: NavigationMenuState) {
        root = this.$el;
        this.$watch<string | null>("value", (value) => {
          if (value !== current) sync(value, current, true);
        });
        this.$nextTick(() => {
          if (this.value && this.value !== current) sync(this.value, null, false);
        });
      },
      show(this: NavigationMenuState, value: string) {
        clearTimeout(leaveTimer);
        this.value = value;
      },
      close(this: NavigationMenuState, returnFocus = false) {
        clearTimeout(leaveTimer);
        const was = this.value;
        this.value = null;
        if (returnFocus && was) triggerOf(was)?.focus();
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
          "x-on:keydown.arrow-down.prevent"(this: NavigationMenuState) {
            this.show(value);
            this.$nextTick(() => {
              contentOf(value)?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
            });
          },
        };
      },
      /** Bind on the panel body of one trigger; it is moved into the shared viewport while open. */
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
