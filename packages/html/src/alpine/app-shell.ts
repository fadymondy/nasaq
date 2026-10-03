// nqAppShell: the app frame (sidebar column, phone sheet, header, page). The markup is the React AppShell's,
// the state lives here. nqRailFlyout is the collapsed rail's sub-menu flyout (SidebarNest).
//
//   <div x-data="nqAppShell({ collapsed: false, width: 256 })" x-modelable="collapsed" x-id="['nq-shell']" x-bind="root">
//     <aside data-slot="app-sidebar" :data-collapsed="collapsed ? '' : undefined" class="group/sidebar …">
//       <div x-data="{ rail: true }">…the sidebar…</div>
//       <div role="separator" x-bind="handle" …></div>
//     </aside>
//     <template x-teleport="body"> …the phone sheet, x-nq-presence="mobileOpen"… </template>
//     …the page…
//   </div>
//
// ⌘B / Ctrl+B toggles the rail on desktop and opens the sheet below md. The width and the collapsed state are
// remembered in localStorage (nasaq-sidebar-width, nasaq-sidebar) unless `persist` is false. `rail` (true inside
// the desktop column, false inside the sheet) tells sidebar parts whether the collapsed rail applies to them.

import type { Magics, Register } from "./types";

const STORAGE_KEY = "nasaq-sidebar";
const WIDTH_KEY = "nasaq-sidebar-width";
const DESKTOP_QUERY = "(min-width: 48rem)";
/** Dragging this far below minWidth snaps the sidebar to the icon rail. */
const SNAP_TO_RAIL = 56;
const KEY_STEP = 16;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // blocked or full: keep the in-memory value
  }
};

const isApple = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const isDesktop = () => typeof window.matchMedia !== "function" || window.matchMedia(DESKTOP_QUERY).matches;

export interface AppShellState extends Magics {
  collapsed: boolean;
  mobileOpen: boolean;
  desktop: boolean;
  width: number;
  resizing: boolean;
  commandOpen: boolean;
  persist: boolean;
  sidebar: boolean;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  setCollapsed(collapsed: boolean): void;
  toggle(): void;
  closeSheet(): void;
  clamp(width: number): number;
  commitWidth(width: number): void;
}

export interface AppShellOptions {
  collapsed?: boolean;
  persist?: boolean;
  sidebar?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
}

export const appShell: Register = (Alpine) => {
  Alpine.data("nqAppShell", (opts: AppShellOptions = {}) => ({
    collapsed: Boolean(opts.collapsed),
    mobileOpen: false,
    desktop: true,
    width: opts.width ?? 256,
    resizing: false,
    commandOpen: false,
    persist: opts.persist !== false,
    sidebar: opts.sidebar !== false,
    minWidth: opts.minWidth ?? 208,
    maxWidth: opts.maxWidth ?? 420,
    defaultWidth: opts.width ?? 256,
    init(this: AppShellState) {
      if (this.persist) {
        const saved = read(STORAGE_KEY);
        if (saved === "collapsed" || saved === "expanded") this.collapsed = saved === "collapsed";
      }
      const savedWidth = Number(read(WIDTH_KEY));
      if (savedWidth) this.width = this.clamp(savedWidth);
      if (typeof window.matchMedia === "function") {
        const mq = window.matchMedia(DESKTOP_QUERY);
        this.desktop = mq.matches;
        mq.addEventListener("change", () => (this.desktop = mq.matches));
      }
    },
    clamp(this: AppShellState, width: number) {
      return Math.round(Math.min(this.maxWidth, Math.max(this.minWidth, width)));
    },
    setCollapsed(this: AppShellState, collapsed: boolean) {
      this.collapsed = collapsed;
      if (this.persist) write(STORAGE_KEY, collapsed ? "collapsed" : "expanded");
    },
    /** Collapses the rail on desktop, opens the sheet below md. */
    toggle(this: AppShellState) {
      if (!this.sidebar) return;
      if (isDesktop()) this.setCollapsed(!this.collapsed);
      else this.mobileOpen = !this.mobileOpen;
    },
    closeSheet(this: AppShellState) {
      this.mobileOpen = false;
    },
    commitWidth(this: AppShellState, width: number) {
      this.width = this.clamp(width);
      write(WIDTH_KEY, String(this.width));
    },
    /** Bind on the shell root: ⌘B / Ctrl+B. Matched on the key's code so it works on Arabic layouts; text fields keep their own. */
    root: {
      "x-on:keydown.window"(this: AppShellState, event: KeyboardEvent) {
        const mod = isApple() ? event.metaKey : event.ctrlKey;
        if (!mod || event.altKey || event.shiftKey) return;
        if (event.code !== "KeyB" && event.key.toLowerCase() !== "b") return;
        const target = event.target;
        if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
        event.preventDefault();
        this.toggle();
      },
    },
    /** Bind on the resize separator: drag, arrow keys, Home/End, Enter and double-click to reset. */
    handle: {
      ":aria-valuenow"(this: AppShellState) {
        return this.width;
      },
      ":aria-hidden"(this: AppShellState) {
        return this.collapsed ? "true" : undefined;
      },
      ":tabindex"(this: AppShellState) {
        return this.collapsed ? -1 : 0;
      },
      ":class"(this: AppShellState) {
        return this.resizing ? "after:bg-nq-accent!" : "";
      },
      "x-on:pointerdown"(this: AppShellState, event: PointerEvent) {
        if (event.button !== 0) return;
        event.preventDefault();
        const handle = event.currentTarget as HTMLElement;
        const rtl = getComputedStyle(handle).direction === "rtl";
        const startX = event.clientX;
        const startWidth = this.collapsed ? this.minWidth - SNAP_TO_RAIL : this.width;
        let current = this.width;
        let rail = this.collapsed;
        this.resizing = true;
        document.documentElement.style.cursor = "col-resize";
        const onMove = (e: PointerEvent) => {
          const raw = startWidth + (rtl ? startX - e.clientX : e.clientX - startX);
          const toRail = raw < this.minWidth - SNAP_TO_RAIL / 2;
          if (toRail !== rail) {
            rail = toRail;
            this.setCollapsed(toRail);
          }
          if (!toRail) {
            current = this.clamp(raw);
            this.width = current;
          }
        };
        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          document.documentElement.style.cursor = "";
          this.resizing = false;
          if (!rail) this.commitWidth(current);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      },
      "x-on:keydown"(this: AppShellState, event: KeyboardEvent) {
        const rtl = getComputedStyle(event.currentTarget as HTMLElement).direction === "rtl";
        const grow = rtl ? "ArrowLeft" : "ArrowRight";
        const shrink = rtl ? "ArrowRight" : "ArrowLeft";
        const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
        let next: number | null = null;
        if (event.key === grow) next = this.collapsed ? this.minWidth : this.width + step;
        else if (event.key === shrink) {
          if (this.collapsed) return;
          if (this.width <= this.minWidth) {
            event.preventDefault();
            this.setCollapsed(true);
            return;
          }
          next = this.width - step;
        } else if (event.key === "Home") next = this.minWidth;
        else if (event.key === "End") next = this.maxWidth;
        else if (event.key === "Enter") next = this.defaultWidth;
        if (next === null) return;
        event.preventDefault();
        if (this.collapsed) this.setCollapsed(false);
        this.commitWidth(next);
      },
      "x-on:dblclick"(this: AppShellState) {
        if (this.collapsed) this.setCollapsed(false);
        this.commitWidth(this.defaultWidth);
      },
    },
  }));

  // The collapsed rail's flyout: opens on hover (100ms) or click, closes 150ms after the pointer leaves.
  Alpine.data("nqRailFlyout", () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
      open: false,
      popupEl: null as HTMLElement | null,
      hover(this: { open: boolean }, open: boolean) {
        clearTimeout(timer);
        timer = setTimeout(() => (this.open = open), open ? 100 : 150);
      },
      toggle(this: { open: boolean }) {
        clearTimeout(timer);
        this.open = !this.open;
      },
      close(this: { open: boolean }) {
        clearTimeout(timer);
        this.open = false;
      },
      /** Bind on the flyout popup: a dialog labelled by its title; a click on a link closes it. */
      popup: {
        role: "dialog",
        tabindex: "-1",
        ":aria-labelledby"(this: Magics) {
          return this.$id("nq-flyout", "title");
        },
        "x-on:keydown.escape.prevent.stop"(this: { close(): void; $refs: Record<string, HTMLElement> }) {
          this.close();
          this.$refs.trigger?.focus();
        },
        "x-on:click.outside"(this: { open: boolean; close(): void; $refs: Record<string, HTMLElement> }, event: Event) {
          if (this.open && !this.$refs.trigger?.contains(event.target as Node)) this.close();
        },
        "x-on:click"(this: { close(): void }, event: Event) {
          if ((event.target as HTMLElement).closest("a")) this.close();
        },
        "x-on:pointerenter"(this: { hover(open: boolean): void }) {
          this.hover(true);
        },
        "x-on:pointerleave"(this: { hover(open: boolean): void }) {
          this.hover(false);
        },
      },
    };
  });
};
