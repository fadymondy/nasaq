// nqDropdownMenu: a menu of actions that opens from a trigger. The markup is the React DropdownMenu one, the state lives here.
//
//   <div x-data="nqDropdownMenu()" x-id="['nq-menu']" class="contents">
//     <button x-ref="trigger" x-bind="trigger">Actions</button>
//     <template x-teleport="body">
//       <div data-slot="dropdown-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.trigger" class="…">
//         <div data-slot="dropdown-menu-item" x-bind="item">Edit</div>
//         <div role="none" data-slot="dropdown-menu-sub" x-data="nqDropdownSub()" class="contents">
//           <div data-slot="dropdown-menu-sub-trigger" x-ref="subtrigger" x-bind="subTrigger">More</div>
//           <template x-teleport="body"><div data-slot="dropdown-menu-sub-content" x-bind="subPopup" x-init="subPopupEl = $el" x-nq-presence="subOpen" x-anchor.right-start.offset.-4="$refs.subtrigger">…</div></template>
//         </div>
//       </div>
//     </template>
//   </div>
//
// Keyboard: ArrowDown/ArrowUp/Home/End move (looping), Enter or Space activate, typing jumps to the next label that starts
// with those letters, Escape closes (focus returns to the trigger), Tab closes. In a submenu the arrow toward the inline end
// opens it and the arrow toward the inline start closes it (swapped in RTL). Items mark themselves with data-highlighted
// and data-disabled as Base UI does. A click on an item closes the whole menu unless the item has data-keep-open
// (checkbox and radio items). open is x-modelable.
// Not ported: the page is not made inert while the menu is open (React modal), and the exit fade is run by x-nq-presence.

import type { Magics, Register } from "./types";

const ITEM = '[role^="menuitem"]';

export interface MenuState extends Magics {
  open: boolean;
  rootEl: HTMLElement | null;
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

export const dropdownMenu: Register = (Alpine) => {
  const dataOf = (el: Element) => (Alpine as unknown as WithData).$data(el);

  Alpine.data("nqDropdownMenu", (initial = false) => ({
    open: Boolean(initial),
    rootEl: null as HTMLElement | null,
    popupEl: null as HTMLElement | null,
    query: "",
    queryTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    init(this: MenuState) {
      this.rootEl = this.$el;
    },
    show(this: MenuState, keyboard = false) {
      if (this.open) return;
      this.open = true;
      this.$nextTick(() => {
        const trigger = this.rootEl?.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
        const popup = this.popupEl;
        if (trigger && popup) {
          popup.style.setProperty("--available-height", `${Math.max(120, window.innerHeight - trigger.getBoundingClientRect().bottom - 16)}px`);
          if (keyboard) this.focusItem(this.items(popup)[0]);
          else popup.focus({ preventScroll: true });
        }
      });
    },
    close(this: MenuState, refocus = true) {
      if (!this.open) return;
      this.closeSubs();
      this.open = false;
      if (refocus) this.rootEl?.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')?.focus();
    },
    toggle(this: MenuState) {
      if (this.open) this.close();
      else this.show();
    },
    /** Closes every open submenu under the menu. */
    closeSubs(this: MenuState) {
      for (const sub of this.popupEl?.querySelectorAll('[data-slot="dropdown-menu-sub"]') ?? []) {
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
      for (const sub of popup?.querySelectorAll('[data-slot="dropdown-menu-sub"]') ?? []) {
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
    /** Bind on the trigger button. */
    trigger: {
      type: "button",
      "aria-haspopup": "menu",
      ":aria-expanded"(this: MenuState) {
        return String(this.open);
      },
      ":data-popup-open"(this: MenuState) {
        return this.open ? "" : undefined;
      },
      "x-on:click"(this: MenuState) {
        this.toggle();
      },
      "x-on:keydown"(this: MenuState, event: KeyboardEvent) {
        if (["ArrowDown", "Enter", " "].includes(event.key)) {
          event.preventDefault();
          this.show(true);
        }
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
        if (this.popupEl?.contains(target) || this.rootEl?.querySelector('[data-slot="dropdown-menu-trigger"]')?.contains(target)) return;
        if (target.closest('[data-slot="dropdown-menu-sub-content"]')) return;
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
  Alpine.data("nqDropdownSub", () => ({
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
      for (const nested of this.subPopupEl?.querySelectorAll('[data-slot="dropdown-menu-sub"]') ?? []) {
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
