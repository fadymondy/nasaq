// nqContextMenu: a menu that opens at the pointer on secondary click, long-press, Shift+F10 or the Menu key.
// The markup is the React ContextMenu one (same items, separators, checkbox, radio and submenus as dropdown-menu), the state lives here.
//
//   <div x-data="nqContextMenu()" class="contents">
//     <div data-slot="context-menu-trigger" x-bind="trigger" class="…">Right-click me</div>
//     <template x-teleport="body">
//       <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" class="fixed …">
//         <div data-slot="context-menu-item" x-bind="item">Copy</div>
//         <div role="none" data-slot="context-menu-sub" x-data="nqContextSub()" class="contents">…</div>
//       </div>
//     </template>
//   </div>
//
// Keyboard and sub-menu behaviour match dropdown-menu (arrows, Home, End, type-ahead, Escape, RTL-swapped submenu arrows).
// Inputs, textareas, links and contenteditable areas keep the browser's own menu, and so does Shift + right-click.
// open is x-modelable. Not ported: the page is not made inert while the menu is open.

import type { Magics, Register } from "./types";

const NATIVE = "input, textarea, select, a[href], [contenteditable=\"\"], [contenteditable=\"true\"]";
const ITEM = '[role^="menuitem"]';

export interface MenuState extends Magics {
  open: boolean;
  rootEl: HTMLElement | null;
  keyboard: boolean;
  longPress: ReturnType<typeof setTimeout> | undefined;
  openAt(x: number, y: number, keyboard?: boolean): void;
  popupEl: HTMLElement | null;
  query: string;
  queryTimer: ReturnType<typeof setTimeout> | undefined;
  show(keyboard?: boolean): void;
  close(refocus?: boolean): void;
  toggle(): void;
  closeSubs(): void;
  items(popup: HTMLElement): HTMLElement[];
  focusItem(el: HTMLElement | undefined): void;
  activate(el: HTMLElement): void;
  navigate(event: KeyboardEvent, popup: HTMLElement): void;
}

interface SubState extends MenuState {
  subOpen: boolean;
  subPopupEl: HTMLElement | null;
  subTimer: ReturnType<typeof setTimeout> | undefined;
  openSub(keyboard?: boolean): void;
  closeSub(refocus?: boolean): void;
}

// The Alpine runtime has $data, the slim AlpineLike type does not list it.
type WithData = { $data(el: Element): Record<string, unknown> };

const isRtl = (el: Element) => (el.closest("[dir]")?.getAttribute("dir") ?? getComputedStyle(el).direction) === "rtl";

export const contextMenu: Register = (Alpine) => {
  const dataOf = (el: Element) => (Alpine as unknown as WithData).$data(el);

  Alpine.data("nqContextMenu", (initial = false) => ({
    open: Boolean(initial),
    rootEl: null as HTMLElement | null,
    popupEl: null as HTMLElement | null,
    query: "",
    queryTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    init(this: MenuState) {
      this.rootEl = this.$el;
    },
    keyboard: false,
    longPress: undefined as ReturnType<typeof setTimeout> | undefined,
    show(this: MenuState, keyboard = false) {
      const r = this.rootEl?.querySelector<HTMLElement>('[data-slot="context-menu-trigger"]')?.getBoundingClientRect();
      this.openAt(r ? r.left + 8 : 0, r ? r.top + 8 : 0, keyboard);
    },
    /** Opens at viewport coordinates, then keeps the popup on screen (flipped to the other side of the pointer when it would overflow). */
    openAt(this: MenuState, x: number, y: number, keyboard = false) {
      this.keyboard = keyboard;
      this.open = true;
      this.$nextTick(() => {
        const popup = this.popupEl;
        if (!popup) return;
        const w = popup.offsetWidth;
        const h = popup.offsetHeight;
        const rtl = isRtl(this.rootEl as Element);
        let left = rtl ? x - w : x;
        if (left < 8) left = Math.min(x, window.innerWidth - w - 8);
        if (left + w > window.innerWidth - 8) left = Math.max(8, x - w);
        let top = y;
        if (top + h > window.innerHeight - 8) top = Math.max(8, y - h);
        popup.style.left = `${Math.max(8, left)}px`;
        popup.style.top = `${top}px`;
        popup.style.setProperty("--available-height", `${Math.max(120, window.innerHeight - 16)}px`);
        if (keyboard) this.focusItem(this.items(popup)[0]);
        else popup.focus({ preventScroll: true });
      });
    },
    close(this: MenuState, refocus = true) {
      if (!this.open) return;
      this.closeSubs();
      this.open = false;
      if (refocus && this.keyboard) this.rootEl?.querySelector<HTMLElement>('[data-slot="context-menu-trigger"]')?.focus();
    },
    toggle(this: MenuState) {
      if (this.open) this.close();
      else this.show();
    },
    /** Closes every open submenu under the menu. */
    closeSubs(this: MenuState) {
      for (const sub of this.popupEl?.querySelectorAll('[data-slot="context-menu-sub"]') ?? []) {
        (dataOf(sub) as unknown as Partial<SubState>).closeSub?.(false);
      }
    },
    /** The focusable items of one popup (a submenu's items live in its own popup). */
    items(this: MenuState, popup: HTMLElement) {
      return [...popup.querySelectorAll<HTMLElement>(ITEM)].filter((el) => !el.hasAttribute("data-disabled") && el.closest('[role="menu"]') === popup);
    },
    focusItem(this: MenuState, el: HTMLElement | undefined) {
      if (!el) return;
      const popup = el.closest<HTMLElement>('[role="menu"]');
      for (const other of popup?.querySelectorAll<HTMLElement>("[data-highlighted]") ?? []) other.removeAttribute("data-highlighted");
      el.setAttribute("data-highlighted", "");
      el.focus({ preventScroll: true });
      el.scrollIntoView?.({ block: "nearest" });
      // Moving to another row closes a submenu that belongs to a different row.
      for (const sub of popup?.querySelectorAll('[data-slot="context-menu-sub"]') ?? []) {
        if (!sub.contains(el)) (dataOf(sub) as unknown as Partial<SubState>).closeSub?.(false);
      }
    },
    activate(this: MenuState, el: HTMLElement) {
      if (el.hasAttribute("data-disabled") || el.hasAttribute("data-keep-open")) return;
      const root = dataOf(this.rootEl as Element) as unknown as MenuState;
      root.close();
    },
    /** Arrow, Home, End, Enter, Space, type-ahead and Tab for one popup. Escape is handled by the caller. */
    navigate(this: MenuState, event: KeyboardEvent, popup: HTMLElement) {
      const items = this.items(popup);
      const at = items.indexOf(document.activeElement as HTMLElement);
      let to: HTMLElement | undefined;
      if (event.key === "ArrowDown") to = items[(at + 1) % items.length];
      else if (event.key === "ArrowUp") to = items[(at - 1 + items.length) % items.length];
      else if (event.key === "Home") to = items[0];
      else if (event.key === "End") to = items[items.length - 1];
      else if (event.key === "Tab") {
        (dataOf(this.rootEl as Element) as unknown as MenuState).close(false);
        return;
      } else if (event.key === "Enter" || (event.key === " " && !this.query)) {
        event.preventDefault();
        items[at]?.click();
        return;
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        this.query += event.key.toLowerCase();
        clearTimeout(this.queryTimer);
        this.queryTimer = setTimeout(() => (this.query = ""), 500);
        const ordered = [...items.slice(at + 1), ...items.slice(0, at + 1)];
        this.focusItem(ordered.find((i) => (i.textContent ?? "").trim().toLowerCase().startsWith(this.query)));
        return;
      } else return;
      event.preventDefault();
      this.focusItem(to);
    },
    /** Bind on the region that owns the menu. */
    trigger: {
      ":data-popup-open"(this: MenuState) {
        return this.open ? "" : undefined;
      },
      "x-on:contextmenu.capture"(this: MenuState, event: MouseEvent) {
        if (event.shiftKey || (event.target as Element).closest?.(NATIVE)) return;
        event.preventDefault();
        this.openAt(event.clientX, event.clientY);
      },
      "x-on:keydown"(this: MenuState, event: KeyboardEvent) {
        if (event.target !== event.currentTarget && (event.target as Element).closest?.(NATIVE)) return;
        if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
          event.preventDefault();
          this.show(true);
        }
      },
      "x-on:touchstart.passive"(this: MenuState, event: TouchEvent) {
        const t = event.touches[0];
        if (!t || (event.target as Element).closest?.(NATIVE)) return;
        clearTimeout(this.longPress);
        this.longPress = setTimeout(() => this.openAt(t.clientX, t.clientY), 500);
      },
      "x-on:touchmove.passive"(this: MenuState) {
        clearTimeout(this.longPress);
      },
      "x-on:touchend"(this: MenuState) {
        clearTimeout(this.longPress);
      },
      "x-on:touchcancel"(this: MenuState) {
        clearTimeout(this.longPress);
      },
    },
    /** Bind on the root popup: a menu that moves focus between its items. */
    popup: {
      role: "menu",
      tabindex: "-1",
      "aria-orientation": "vertical",
      "x-on:keydown"(this: MenuState, event: KeyboardEvent) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          this.close();
          return;
        }
        this.navigate(event, event.currentTarget as HTMLElement);
      },
      /** Pointer down outside the menu, its submenus and the trigger closes it. */
      "x-on:pointerdown.document"(this: MenuState, event: PointerEvent) {
        if (!this.open) return;
        const target = event.target as Element;
        if (this.popupEl?.contains(target)) return;
        if (target.closest('[data-slot="context-menu-sub-content"]')) return;
        this.close(false);
      },
    },
    /** Bind on every action row (and checkbox and radio rows). The row carries its own role: menuitem, menuitemcheckbox or menuitemradio. */
    item: {
      tabindex: "-1",
      "x-on:pointermove"(this: MenuState, event: PointerEvent) {
        const el = event.currentTarget as HTMLElement;
        if (!el.hasAttribute("data-disabled") && !el.hasAttribute("data-highlighted")) this.focusItem(el);
      },
      "x-on:pointerleave"(this: MenuState, event: PointerEvent) {
        (event.currentTarget as HTMLElement).removeAttribute("data-highlighted");
      },
      "x-on:focus"(this: MenuState, event: FocusEvent) {
        if (event.target === event.currentTarget) (event.currentTarget as HTMLElement).setAttribute("data-highlighted", "");
      },
      "x-on:blur"(this: MenuState, event: FocusEvent) {
        (event.currentTarget as HTMLElement).removeAttribute("data-highlighted");
      },
      "x-on:click"(this: MenuState, event: MouseEvent) {
        this.activate(event.currentTarget as HTMLElement);
      },
    },
  }));

  // A submenu: wraps the sub trigger and sub content, inside the parent menu popup.
  Alpine.data("nqContextSub", () => ({
    subOpen: false,
    subPopupEl: null as HTMLElement | null,
    subTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    openSub(this: SubState, keyboard = false) {
      clearTimeout(this.subTimer);
      if (this.subOpen) return;
      this.subOpen = true;
      this.$nextTick(() => {
        const popup = this.subPopupEl;
        if (!popup) return;
        popup.style.setProperty("--available-height", `${Math.max(120, window.innerHeight - 16)}px`);
        if (keyboard) this.focusItem(this.items(popup)[0]);
      });
    },
    closeSub(this: SubState, refocus = true) {
      clearTimeout(this.subTimer);
      if (!this.subOpen) return;
      for (const nested of this.subPopupEl?.querySelectorAll('[data-slot="context-menu-sub"]') ?? []) {
        (dataOf(nested) as unknown as Partial<SubState>).closeSub?.(false);
      }
      this.subOpen = false;
      if (refocus) this.$refs.subtrigger?.focus();
    },
    /** Bind on the row that opens the submenu. */
    subTrigger: {
      tabindex: "-1",
      "aria-haspopup": "menu",
      ":aria-expanded"(this: SubState) {
        return String(this.subOpen);
      },
      ":data-popup-open"(this: SubState) {
        return this.subOpen ? "" : undefined;
      },
      "x-on:pointermove"(this: SubState, event: PointerEvent) {
        const el = event.currentTarget as HTMLElement;
        if (el.hasAttribute("data-disabled")) return;
        if (!el.hasAttribute("data-highlighted")) this.focusItem(el);
        if (!this.subOpen && !this.subTimer) this.subTimer = setTimeout(() => ((this.subTimer = undefined), this.openSub()), 100);
      },
      "x-on:pointerleave"(this: SubState) {
        clearTimeout(this.subTimer);
        this.subTimer = undefined;
      },
      "x-on:focus"(this: SubState, event: FocusEvent) {
        if (event.target === event.currentTarget) (event.currentTarget as HTMLElement).setAttribute("data-highlighted", "");
      },
      "x-on:blur"(this: SubState, event: FocusEvent) {
        // Stays highlighted while its submenu is open.
        if (!this.subOpen) (event.currentTarget as HTMLElement).removeAttribute("data-highlighted");
      },
      "x-on:click"(this: SubState, event: MouseEvent) {
        if ((event.currentTarget as HTMLElement).hasAttribute("data-disabled")) return;
        this.openSub();
      },
      "x-on:keydown"(this: SubState, event: KeyboardEvent) {
        const enter = isRtl(event.currentTarget as Element) ? "ArrowLeft" : "ArrowRight";
        if (event.key === enter || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          this.openSub(true);
        }
      },
    },
    /** Bind on the submenu popup. */
    subPopup: {
      role: "menu",
      tabindex: "-1",
      "aria-orientation": "vertical",
      "x-on:keydown"(this: SubState, event: KeyboardEvent) {
        const popup = event.currentTarget as HTMLElement;
        const back = isRtl(popup) ? "ArrowRight" : "ArrowLeft";
        if (event.key === "Escape" || event.key === back) {
          event.preventDefault();
          event.stopPropagation();
          this.closeSub();
          return;
        }
        this.navigate(event, popup);
      },
    },
  }));
};
