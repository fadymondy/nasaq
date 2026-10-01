// nqDesktopShell: a desktop for the browser: wallpaper, a menu bar, a dock, a launchpad and a window manager (drag, resize,
// snap to the inline edges, maximise, minimise). The markup is in the Blade component desktop-os-shell; the window list lives here.
//
//   <div x-data="nqDesktopShell([{ id: 'files', title: 'Files', iconHtml: '…', content: '<p>Files</p>', single: true }])" x-modelable="launchpad">
//     <div x-ref="area"><template x-for="win in windows" :key="win.id">…</template></div>
//   </div>
//
// apps: id, title, iconHtml (the dock and launchpad tile), content (trusted HTML for the window body, started as its own Alpine
// tree), size { w, h }, single, pinned, keywords. Events from the root (bubbling): "nq-windows-change" { windows },
// "nq-launchpad-change" { open }, "nq-desktop-menu" { id } (a menu item, from the Blade menu bar). Icons that sit on the desktop
// ask to open an app with a bubbling "nq-desktop-icon-open" { id } (desktop-icons); the shell opens it.
// Not ported: menus as a function of the focused app (give static menus), and the context menu's closeAll for a custom handler.

import {
  clampRect,
  closeWindow,
  filterApps,
  focusedWindow,
  focusWindow,
  minimiseWindow,
  openWindow,
  patchWindow,
  resizeRect,
  snapRect,
  snapWindow,
  snapZone,
  toggleMaximise,
  unsnapForDrag,
  windowsOf,
  type DesktopBounds,
  type DesktopSnap,
  type DesktopWindowState,
  type ResizeHandle,
} from "./desktop-os-shell-logic";
import type { Magics, Register } from "./types";

export interface DesktopShellApp {
  id: string;
  title: string;
  iconHtml?: string;
  content?: string;
  size?: { w: number; h: number };
  single?: boolean;
  pinned?: boolean;
  keywords?: string[];
}

export interface DesktopShellOptions {
  windows?: DesktopWindowState[];
  compactBelow?: number;
  launchpad?: boolean;
}

interface Nq {
  dir: string;
}
interface ShellState extends Magics {
  $nq: Nq;
  apps: DesktopShellApp[];
  windows: DesktopWindowState[];
  launchpad: boolean;
  query: string;
  size: { w: number; h: number };
  preview: DesktopSnap | null;
  compactBelow: number;
  root: HTMLElement;
  area: HTMLElement | null;
  appOf(id: string): DesktopShellApp | undefined;
  compact(): boolean;
  bounds(): DesktopBounds;
  top(): DesktopWindowState | undefined;
  setWindows(next: DesktopWindowState[]): void;
  setLaunchpad(open: boolean): void;
  openApp(app: DesktopShellApp): void;
  pointerMove(event: PointerEvent): void;
  pointerUp(event: PointerEvent): void;
  refit(): void;
}

type Gesture =
  | { kind: "move"; id: string; startX: number; startY: number; base: DesktopWindowState; grab: number }
  | { kind: "resize"; id: string; handle: ResizeHandle; startX: number; startY: number; base: DesktopWindowState };

const DOCK_SPACE = 76;

export const desktopOsShell: Register = (Alpine) => {
  Alpine.data("nqDesktopShell", (apps: DesktopShellApp[] = [], options: DesktopShellOptions = {}) => {
    // Outside the reactive state: the drag in progress and the window listeners.
    let gesture: Gesture | null = null;
    let onMove: (e: PointerEvent) => void = () => {};
    let onUp: (e: PointerEvent) => void = () => {};
    let observer: ResizeObserver | undefined;

    return {
      apps,
      windows: (options.windows ?? []) as DesktopWindowState[],
      launchpad: Boolean(options.launchpad),
      query: "",
      size: { w: 1000, h: 640 },
      preview: null as DesktopSnap | null,
      compactBelow: options.compactBelow ?? 640,
      root: null as unknown as HTMLElement,
      area: null as HTMLElement | null,

      init(this: ShellState) {
        this.root = this.$el;
        this.area = this.$refs.area ?? null;
        const el = this.area;
        if (el && typeof ResizeObserver !== "undefined") {
          const measure = () => (this.size = { w: el.clientWidth || this.size.w, h: el.clientHeight || this.size.h });
          measure();
          observer = new ResizeObserver(measure);
          observer.observe(el);
        }
        onMove = (event) => this.pointerMove(event);
        onUp = (event) => this.pointerUp(event);
        // When the container shrinks, a floating window is pulled back inside it.
        this.$watch("size", () => this.refit());
        this.$watch("launchpad", (open: boolean) => {
          this.root.dispatchEvent(new CustomEvent("nq-launchpad-change", { bubbles: true, detail: { open } }));
          if (open) this.$nextTick(() => this.root.querySelector<HTMLInputElement>('[data-slot="desktop-launchpad"] input')?.focus());
          else this.query = "";
        });
      },
      destroy() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        observer?.disconnect();
      },

      appOf(this: ShellState, id: string) {
        return this.apps.find((a) => a.id === id);
      },
      compact(this: ShellState) {
        return this.size.w < this.compactBelow;
      },
      bounds(this: ShellState): DesktopBounds {
        return { w: this.size.w, h: Math.max(200, this.size.h - (this.compact() ? 0 : DOCK_SPACE)) };
      },
      top(this: ShellState) {
        return focusedWindow(this.windows);
      },
      focusedTitle(this: ShellState) {
        const w = this.top();
        return w ? (this.appOf(w.appId)?.title ?? "") : "";
      },
      setWindows(this: ShellState, next: DesktopWindowState[]) {
        this.windows = next;
        this.root.dispatchEvent(new CustomEvent("nq-windows-change", { bubbles: true, detail: { windows: next } }));
      },
      setLaunchpad(this: ShellState, open: boolean) {
        this.launchpad = open;
      },
      /** A menu bar item: "menuId.itemId" goes out as a bubbling event. (The menu is teleported, so it can't bubble itself.) */
      menuPick(this: ShellState, id: string) {
        this.root.dispatchEvent(new CustomEvent("nq-desktop-menu", { bubbles: true, detail: { id } }));
      },

      // Apps and the dock.
      dockApps(this: ShellState) {
        return this.apps.filter((a) => a.pinned !== false || windowsOf(this.windows, a.id).length > 0);
      },
      running(this: ShellState, app: DesktopShellApp) {
        return windowsOf(this.windows, app.id).length > 0;
      },
      isFocused(this: ShellState, app: DesktopShellApp) {
        const w = this.top();
        return Boolean(w && w.appId === app.id);
      },
      shownApps(this: ShellState) {
        return filterApps(this.apps, this.query);
      },
      openApp(this: ShellState, app: DesktopShellApp) {
        this.setWindows(openWindow(this.windows, this.bounds(), { appId: app.id, size: app.size, single: app.single, compact: this.compact() }));
      },
      /** The dock icon: open, focus, or minimise the app that has focus already. */
      activate(this: ShellState & { activate(a: DesktopShellApp): void }, app: DesktopShellApp) {
        this.setLaunchpad(false);
        const own = windowsOf(this.windows, app.id);
        const last = own[own.length - 1];
        if (!last) return this.openApp(app);
        const top = this.top();
        if (top && top.id === last.id) this.setWindows(minimiseWindow(this.windows, last.id));
        else this.setWindows(focusWindow(this.windows, last.id));
      },
      /** Opens the app, or brings its latest window to the front (the desktop icons use this). */
      openById(this: ShellState, appId: string) {
        const app = this.appOf(appId);
        if (!app) return;
        this.setLaunchpad(false);
        const last = windowsOf(this.windows, app.id).at(-1);
        if (last) this.setWindows(focusWindow(this.windows, last.id));
        else this.openApp(app);
      },
      newWindow(this: ShellState, app: DesktopShellApp) {
        this.setLaunchpad(false);
        this.openApp(app);
      },
      closeAll(this: ShellState, app: DesktopShellApp) {
        this.setWindows(this.windows.filter((w) => w.appId !== app.id));
      },
      pickFirst(this: ShellState & { activate(a: DesktopShellApp): void }) {
        const first = filterApps(this.apps, this.query)[0];
        if (first) this.activate(first);
      },

      // Windows.
      isFull(win: DesktopWindowState) {
        return win.maximised || win.snap !== null;
      },
      z(this: ShellState, win: DesktopWindowState) {
        return 10 + this.windows.indexOf(win);
      },
      /** The window as drawn: full size on a narrow container, and only the top one visible there. */
      shown(this: ShellState, win: DesktopWindowState): DesktopWindowState {
        const compact = this.compact();
        const base = compact ? { ...win, x: 0, y: 0, w: this.size.w, h: this.size.h, maximised: true } : win;
        const top = compact ? this.top()?.id : undefined;
        return top !== undefined && top !== win.id ? { ...base, minimised: true } : base;
      },
      frameStyle(this: ShellState & { shown(w: DesktopWindowState): DesktopWindowState; z(w: DesktopWindowState): number }, win: DesktopWindowState) {
        const s = this.shown(win);
        return { insetInlineStart: `${s.x}px`, top: `${s.y}px`, width: `${s.w}px`, height: `${s.h}px`, zIndex: String(this.z(win)) };
      },
      focusWin(this: ShellState, id: string) {
        if (this.windows.length && this.windows[this.windows.length - 1]!.id === id && !this.windows[this.windows.length - 1]!.minimised) return;
        this.setWindows(focusWindow(this.windows, id));
      },
      closeWin(this: ShellState, id: string) {
        this.setWindows(closeWindow(this.windows, id));
      },
      minimiseWin(this: ShellState, id: string) {
        this.setWindows(minimiseWindow(this.windows, id));
      },
      maximiseWin(this: ShellState, id: string) {
        this.setWindows(toggleMaximise(this.windows, id, this.bounds()));
      },
      /** Start the window's content: its HTML, as its own Alpine tree. */
      mount(this: ShellState, el: HTMLElement, appId: string) {
        el.innerHTML = this.appOf(appId)?.content ?? "";
        (window as unknown as { Alpine?: { initTree(el: Element): void } }).Alpine?.initTree(el);
      },
      previewStyle(this: ShellState) {
        if (!this.preview) return {};
        const r = snapRect(this.preview, this.bounds());
        return { insetInlineStart: `${r.x + 6}px`, top: `${r.y + 6}px`, width: `${r.w - 12}px`, height: `${r.h - 12}px`, zIndex: "800" };
      },

      // Drag and resize, with native pointer events on the window.
      areaPoint(this: ShellState, event: { clientX: number; clientY: number }) {
        const rect = this.area?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return { x: this.$nq.dir === "rtl" ? rect.right - event.clientX : event.clientX - rect.left, y: event.clientY - rect.top };
      },
      attach() {
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      },
      detach() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      },
      beginMove(this: ShellState & { areaPoint(e: PointerEvent): { x: number; y: number }; attach(): void }, event: PointerEvent, win: DesktopWindowState) {
        if (this.compact()) return;
        if ((event.target as HTMLElement).closest("button")) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        const p = this.areaPoint(event);
        gesture = { kind: "move", id: win.id, startX: p.x, startY: p.y, base: win, grab: win.w ? (p.x - win.x) / win.w : 0.5 };
        (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
        this.attach();
      },
      beginResize(this: ShellState & { areaPoint(e: PointerEvent): { x: number; y: number }; attach(): void }, event: PointerEvent, win: DesktopWindowState, handle: ResizeHandle) {
        const p = this.areaPoint(event);
        gesture = { kind: "resize", id: win.id, handle, startX: p.x, startY: p.y, base: win };
        (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
        event.preventDefault();
        this.attach();
      },
      pointerMove(this: ShellState & { areaPoint(e: PointerEvent): { x: number; y: number } }, event: PointerEvent) {
        const g = gesture;
        if (!g) return;
        const p = this.areaPoint(event);
        const dx = p.x - g.startX;
        const dy = p.y - g.startY;
        if (g.kind === "resize") {
          this.setWindows(patchWindow(this.windows, g.id, resizeRect(g.base, g.handle, dx, dy)));
          return;
        }
        const base = g.base;
        if ((base.maximised || base.snap) && Math.abs(dx) + Math.abs(dy) > 4) {
          const restored = unsnapForDrag(base, p.x, p.y, g.grab, this.bounds());
          g.base = restored;
          g.startX = p.x;
          g.startY = p.y;
          this.setWindows(this.windows.map((w) => (w.id === g.id ? restored : w)));
          return;
        }
        if (base.maximised || base.snap) return;
        this.setWindows(patchWindow(this.windows, g.id, clampRect({ x: base.x + dx, y: base.y + dy, w: base.w, h: base.h }, this.bounds())));
        this.preview = snapZone(p, this.bounds());
      },
      pointerUp(this: ShellState & { areaPoint(e: PointerEvent): { x: number; y: number }; detach(): void }, event: PointerEvent) {
        const g = gesture;
        gesture = null;
        this.detach();
        if (!g) return;
        this.preview = null;
        if (g.kind === "move") {
          const zone = snapZone(this.areaPoint(event), this.bounds());
          if (zone) this.setWindows(snapWindow(this.windows, g.id, zone, this.bounds()));
        }
      },
      refit(this: ShellState) {
        let changed = false;
        const b = this.bounds();
        const next = this.windows.map((w) => {
          if (w.maximised || w.snap) {
            const r = w.snap ? snapRect(w.snap, b) : snapRect("top", b);
            if (r.w !== w.w || r.h !== w.h || r.x !== w.x) {
              changed = true;
              return { ...w, ...r };
            }
            return w;
          }
          const c = clampRect(w, b);
          if (c.x !== w.x || c.y !== w.y) {
            changed = true;
            return { ...w, ...c };
          }
          return w;
        });
        if (changed) this.setWindows(next);
      },
    };
  });
};
