"use client";

import { LayoutGrid, Maximize2, Minimize2, Minus, Search, X } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { Input } from "../field";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "../menubar";
import {
  clampRect,
  closeWindow,
  type DesktopBounds,
  type DesktopSnap,
  type DesktopWindowState,
  filterApps,
  focusedWindow,
  focusWindow,
  minimiseWindow,
  openWindow,
  patchWindow,
  type ResizeHandle,
  resizeRect,
  snapRect,
  snapWindow,
  snapZone,
  toggleMaximise,
  unsnapForDrag,
  windowsOf,
} from "./desktop-math";

const STRINGS = {
  en: {
    launchpad: "Launchpad",
    searchApps: "Search apps",
    noApps: "No apps match",
    close: "Close",
    minimise: "Minimise",
    maximise: "Maximise",
    restore: "Restore",
    open: "Open",
    newWindow: "New window",
    closeAll: "Close all windows",
    dock: "Dock",
    desktop: "Desktop",
    menuBar: "Menu bar",
    running: "Running",
  },
  ar: {
    launchpad: "لوحة التطبيقات",
    searchApps: "ابحث في التطبيقات",
    noApps: "لا توجد تطبيقات مطابقة",
    close: "إغلاق",
    minimise: "تصغير",
    maximise: "تكبير",
    restore: "استعادة",
    open: "فتح",
    newWindow: "نافذة جديدة",
    closeAll: "إغلاق كل النوافذ",
    dock: "الشريط السفلي",
    desktop: "سطح المكتب",
    menuBar: "شريط القوائم",
    running: "قيد التشغيل",
  },
};

export type DesktopShellLabels = Partial<(typeof STRINGS)["en"]>;

function useDesktopStrings(labels?: DesktopShellLabels) {
  const ctx = useOptionalNasaq();
  const ar = ctx?.locale?.startsWith("ar") ?? false;
  const rtl = ctx?.direction ? ctx.direction === "rtl" : ar;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels }, rtl };
}

export type { DesktopBounds, DesktopRect, DesktopSnap, DesktopWindowState } from "./desktop-math";

export interface DesktopApp {
  id: string;
  title: string;
  /** The icon tile in the dock and the launchpad. Any node; a lucide glyph in a `DesktopAppIcon` looks right. */
  icon: ReactNode;
  /** The window body. */
  content: ReactNode;
  /** Starting size of a new window. */
  size?: { w: number; h: number };
  /** One window at most. Opening it again focuses it. */
  single?: boolean;
  /** Stays in the dock when closed. Default true. */
  pinned?: boolean;
  /** Extra words the launchpad search matches. */
  keywords?: readonly string[];
}

export interface DesktopMenuItem {
  id: string;
  label: string;
  onSelect?: () => void;
  shortcut?: string | readonly string[];
  disabled?: boolean;
  danger?: boolean;
  /** A separator goes before this item. */
  separated?: boolean;
}

export interface DesktopMenu {
  id: string;
  label: string;
  items: readonly DesktopMenuItem[];
}

/** A rounded icon tile with a token background. Wrap a lucide glyph in it for the dock and launchpad. */
export function DesktopAppIcon({ children, className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="desktop-app-icon"
      className={cn("grid size-full place-items-center rounded-[22%] bg-card text-primary shadow-sm ring-1 ring-border [&_svg]:size-1/2", className)}
      {...props}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ menu bar */

export interface DesktopMenuBarProps extends React.ComponentProps<"div"> {
  /** The name of the app that has focus, shown first in bold. */
  appName?: string;
  menus?: readonly DesktopMenu[];
  /** Inline start, before the app name (a logo). */
  start?: ReactNode;
  /** Inline end: clock, battery, status icons. */
  end?: ReactNode;
  labels?: DesktopShellLabels;
}

/** The bar across the top of the desktop. Built on `Menubar`, so arrows and hover-switching work. */
export function DesktopMenuBar({ appName, menus = [], start, end, labels, className, ...props }: DesktopMenuBarProps) {
  const { t } = useDesktopStrings(labels);
  return (
    <div
      data-slot="desktop-menu-bar"
      role="presentation"
      aria-label={t.menuBar}
      className={cn("flex h-8 shrink-0 items-center gap-1 border-b border-border/60 bg-card/70 px-2 text-caption backdrop-blur-md", className)}
      {...props}
    >
      {start}
      {appName ? <span className="px-2 text-label font-semibold text-foreground">{appName}</span> : null}
      {menus.length ? (
        <Menubar className="h-6 min-h-0 border-0 bg-transparent p-0">
          {menus.map((menu) => (
            <MenubarMenu key={menu.id}>
              <MenubarTrigger className="min-h-0 px-2 text-caption">{menu.label}</MenubarTrigger>
              <MenubarContent>
                {menu.items.map((item) => (
                  <div key={item.id} role="none">
                    {item.separated ? <MenubarSeparator /> : null}
                    <MenubarItem variant={item.danger ? "danger" : "default"} shortcut={item.shortcut} disabled={item.disabled} onClick={() => item.onSelect?.()}>
                      {item.label}
                    </MenubarItem>
                  </div>
                ))}
              </MenubarContent>
            </MenubarMenu>
          ))}
        </Menubar>
      ) : null}
      <div className="ms-auto flex items-center gap-3 px-2 text-muted-foreground">{end}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ dock */

export interface DesktopDockProps extends Omit<React.ComponentProps<"nav">, "children"> {
  apps: readonly DesktopApp[];
  windows: readonly DesktopWindowState[];
  onActivate: (app: DesktopApp) => void;
  onNewWindow?: (app: DesktopApp) => void;
  onCloseAll?: (app: DesktopApp) => void;
  onLaunchpad?: () => void;
  launchpadOpen?: boolean;
  labels?: DesktopShellLabels;
}

/** Pinned and running apps as a floating pill. A dot marks running apps; context-click for window actions. */
export function DesktopDock({ apps, windows, onActivate, onNewWindow, onCloseAll, onLaunchpad, launchpadOpen, labels, className, ...props }: DesktopDockProps) {
  const { t } = useDesktopStrings(labels);
  const items = apps.filter((a) => a.pinned !== false || windowsOf(windows, a.id).length > 0);
  const focus = focusedWindow(windows);
  return (
    <nav
      data-slot="desktop-dock"
      aria-label={t.dock}
      className={cn("flex items-end gap-1.5 rounded-2xl border border-border/70 bg-card/80 p-1.5 shadow-lg backdrop-blur-md", className)}
      {...props}
    >
      {onLaunchpad ? (
        <>
          <button
            type="button"
            aria-label={t.launchpad}
            title={t.launchpad}
            aria-pressed={launchpadOpen}
            onClick={onLaunchpad}
            className="grid size-11 place-items-center rounded-xl bg-secondary text-foreground outline-none transition-transform duration-150 ease-nq hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-nq-focus"
          >
            <LayoutGrid aria-hidden className="size-5" />
          </button>
          <span aria-hidden className="mx-0.5 h-8 w-px self-center bg-border" />
        </>
      ) : null}
      {items.map((app) => {
        const own = windowsOf(windows, app.id);
        const running = own.length > 0;
        const isFocus = !!focus && focus.appId === app.id;
        const actions: ContextMenuAction[] = [
          { id: "open", label: running ? t.newWindow : t.open, onSelect: () => (running ? onNewWindow?.(app) : onActivate(app)) },
          ...(running && onCloseAll ? [{ id: "close-all", label: t.closeAll, danger: true, group: "end", onSelect: () => onCloseAll(app) }] : []),
        ];
        return (
          <ContextMenuActions
            key={app.id}
            actions={actions}
            render={
              <button
                type="button"
                aria-label={app.title}
                title={app.title}
                data-running={running ? "" : undefined}
                data-focused={isFocus ? "" : undefined}
                onClick={() => onActivate(app)}
                className="group relative flex size-11 flex-col items-center rounded-xl outline-none transition-transform duration-150 ease-nq hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus"
              />
            }
          >
            <span className="size-11">{app.icon}</span>
            {running ? <span aria-hidden className="absolute -bottom-1 size-1 rounded-full bg-foreground" /> : null}
            {running ? <span className="sr-only">{t.running}</span> : null}
          </ContextMenuActions>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ launchpad */

export interface DesktopLaunchpadProps extends Omit<React.ComponentProps<"div">, "children" | "onSelect"> {
  apps: readonly DesktopApp[];
  onSelect: (app: DesktopApp) => void;
  onClose: () => void;
  labels?: DesktopShellLabels;
}

/** A full-desktop overlay with a search box and a grid of app icons. Escape or a click outside closes it. */
export function DesktopLaunchpad({ apps, onSelect, onClose, labels, className, ...props }: DesktopLaunchpadProps) {
  const { t } = useDesktopStrings(labels);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => filterApps(apps, query), [apps, query]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the backdrop closes on click; Escape is the keyboard path
    <div
      data-slot="desktop-launchpad"
      role="dialog"
      aria-modal="true"
      aria-label={t.launchpad}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.launchpadGrid !== undefined) onClose();
      }}
      className={cn("absolute inset-0 z-[900] flex flex-col items-center gap-8 overflow-y-auto bg-background/70 px-6 pt-10 pb-28 backdrop-blur-xl", className)}
      {...props}
    >
      <div className="relative w-full max-w-xs">
        <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <Input
          autoFocus
          type="search"
          aria-label={t.searchApps}
          placeholder={t.searchApps}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && shown[0]) onSelect(shown[0]);
          }}
          className="ps-9"
        />
      </div>
      {shown.length ? (
        <ul data-launchpad-grid="" className="grid w-full max-w-3xl grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-x-4 gap-y-6">
          {shown.map((app) => (
            <li key={app.id} className="flex justify-center">
              <button
                type="button"
                onClick={() => onSelect(app)}
                className="flex w-22 flex-col items-center gap-2 rounded-xl p-1 text-label text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                <span className="size-16">{app.icon}</span>
                <span className="max-w-full truncate">{app.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-muted-foreground">{t.noApps}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ window */

const HANDLES: { handle: ResizeHandle; className: string }[] = [
  { handle: "n", className: "inset-x-2 top-0 h-1.5 cursor-ns-resize" },
  { handle: "s", className: "inset-x-2 bottom-0 h-1.5 cursor-ns-resize" },
  { handle: "e", className: "inset-y-2 end-0 w-1.5 cursor-ew-resize" },
  { handle: "w", className: "inset-y-2 start-0 w-1.5 cursor-ew-resize" },
  { handle: "ne", className: "top-0 end-0 size-3 cursor-nesw-resize rtl:cursor-nwse-resize" },
  { handle: "nw", className: "top-0 start-0 size-3 cursor-nwse-resize rtl:cursor-nesw-resize" },
  { handle: "se", className: "bottom-0 end-0 size-3 cursor-nwse-resize rtl:cursor-nesw-resize" },
  { handle: "sw", className: "bottom-0 start-0 size-3 cursor-nesw-resize rtl:cursor-nwse-resize" },
];

interface WindowFrameProps {
  win: DesktopWindowState;
  app: DesktopApp;
  focused: boolean;
  compact: boolean;
  z: number;
  t: (typeof STRINGS)["en"];
  onFocus: () => void;
  onClose: () => void;
  onMinimise: () => void;
  onToggleMaximise: () => void;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  onResizeStart: (event: PointerEvent<HTMLDivElement>, handle: ResizeHandle) => void;
}

function WindowFrame({ win, app, focused, compact, z, t, onFocus, onClose, onMinimise, onToggleMaximise, onDragStart, onResizeStart }: WindowFrameProps) {
  const style: CSSProperties = { insetInlineStart: win.x, top: win.y, width: win.w, height: win.h, zIndex: z };
  const full = win.maximised || win.snap !== null;
  const control = "grid size-6 place-items-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus";
  return (
    <section
      data-slot="desktop-window"
      data-focused={focused ? "" : undefined}
      data-maximised={win.maximised ? "" : undefined}
      aria-label={app.title}
      hidden={win.minimised}
      className={cn(
        "absolute flex flex-col overflow-hidden border bg-card text-foreground",
        full ? "rounded-none border-border" : "rounded-xl shadow-lg",
        focused ? "border-border shadow-2xl" : "border-border/60",
      )}
      style={style}
      onPointerDownCapture={onFocus}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the title bar drags with a pointer; the buttons hold the keyboard actions */}
      <div
        data-slot="desktop-window-title"
        onPointerDown={compact ? undefined : onDragStart}
        onDoubleClick={compact ? undefined : onToggleMaximise}
        className={cn("flex h-9 shrink-0 select-none items-center gap-2 border-b border-border bg-secondary/60 ps-2 pe-1", !compact && "cursor-default [touch-action:none]")}
      >
        <span className="size-5 shrink-0">{app.icon}</span>
        <span className={cn("min-w-0 flex-1 truncate text-label", focused ? "text-foreground" : "text-muted-foreground")}>{app.title}</span>
        <button type="button" className={control} aria-label={t.minimise} title={t.minimise} onClick={onMinimise}>
          <Minus aria-hidden className="size-3.5" />
        </button>
        {compact ? null : (
          <button type="button" className={control} aria-label={win.maximised ? t.restore : t.maximise} title={win.maximised ? t.restore : t.maximise} onClick={onToggleMaximise}>
            {win.maximised ? <Minimize2 aria-hidden className="size-3.5" /> : <Maximize2 aria-hidden className="size-3.5" />}
          </button>
        )}
        <button type="button" className={cn(control, "hover:bg-nq-danger hover:text-background")} aria-label={t.close} title={t.close} onClick={onClose}>
          <X aria-hidden className="size-3.5" />
        </button>
      </div>
      <div data-slot="desktop-window-body" className="min-h-0 flex-1 overflow-auto">
        {app.content}
      </div>
      {full || compact
        ? null
        : HANDLES.map(({ handle, className }) => (
            <div key={handle} aria-hidden data-handle={handle} className={cn("absolute z-10 [touch-action:none]", className)} onPointerDown={(event) => onResizeStart(event, handle)} />
          ))}
    </section>
  );
}

/* ------------------------------------------------------------------ shell */

export interface DesktopShellProps extends Omit<React.ComponentProps<"div">, "children"> {
  apps: readonly DesktopApp[];
  /** Controlled window list, back to front. Leave out for an uncontrolled desktop. */
  windows?: readonly DesktopWindowState[];
  defaultWindows?: readonly DesktopWindowState[];
  onWindowsChange?: (windows: DesktopWindowState[]) => void;
  /** Menus after the app name. A function gets the app that has focus. */
  menus?: readonly DesktopMenu[] | ((focused: DesktopApp | undefined) => readonly DesktopMenu[]);
  /** Any node (an image, a gradient, a canvas) or a CSS background value. Default: a token gradient. */
  wallpaper?: ReactNode;
  /** Inline start of the menu bar, before the app name (a logo). */
  menuBarStart?: ReactNode;
  /** Inline end of the menu bar (clock, battery, status icons). */
  menuBarEnd?: ReactNode;
  launchpadOpen?: boolean;
  onLaunchpadOpenChange?: (open: boolean) => void;
  /** Container width under which windows go full size and the dock replaces dragging. Default 640. */
  compactBelow?: number;
  /** Desktop content behind the windows (icons, widgets). */
  children?: ReactNode;
  labels?: DesktopShellLabels;
}

const DOCK_SPACE = 76;

type Gesture =
  | { kind: "move"; id: string; startX: number; startY: number; base: DesktopWindowState; grab: number; unsnapped: boolean }
  | { kind: "resize"; id: string; handle: ResizeHandle; startX: number; startY: number; base: DesktopWindowState };

/**
 * A desktop for the browser: wallpaper, a menu bar, a dock, a launchpad and a window manager (drag, resize, snap to
 * the inline edges, maximise, minimise). It is a shell, not an OS: apps are plain React nodes and the window list is
 * plain data, controlled or not. On a narrow container the windows go full size and only the top one shows.
 */
export function DesktopShell({
  apps,
  windows: windowsProp,
  defaultWindows = [],
  onWindowsChange,
  menus,
  wallpaper,
  menuBarStart,
  menuBarEnd,
  launchpadOpen: launchpadProp,
  onLaunchpadOpenChange,
  compactBelow = 640,
  children,
  labels,
  className,
  ...props
}: DesktopShellProps) {
  const { t, rtl } = useDesktopStrings(labels);
  const [inner, setInner] = useState<readonly DesktopWindowState[]>(defaultWindows);
  const windows = windowsProp ?? inner;
  const windowsRef = useRef(windows);
  windowsRef.current = windows;
  const setWindows = useCallback(
    (next: DesktopWindowState[]) => {
      windowsRef.current = next;
      if (windowsProp === undefined) setInner(next);
      onWindowsChange?.(next);
    },
    [windowsProp, onWindowsChange],
  );
  const [launchInner, setLaunchInner] = useState(false);
  const launchpadOpen = launchpadProp ?? launchInner;
  const setLaunchpad = (open: boolean) => {
    if (launchpadProp === undefined) setLaunchInner(open);
    onLaunchpadOpenChange?.(open);
  };

  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 640 });
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const compact = size.w < compactBelow;
  const bounds: DesktopBounds = { w: size.w, h: Math.max(200, size.h - (compact ? 0 : DOCK_SPACE)) };
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const appOf = useCallback((id: string) => apps.find((a) => a.id === id), [apps]);
  const top = focusedWindow(windows);
  const focusedApp = top ? appOf(top.appId) : undefined;
  const menuList = typeof menus === "function" ? menus(focusedApp) : (menus ?? []);

  const open = (app: DesktopApp) => {
    setWindows(openWindow(windowsRef.current, boundsRef.current, { appId: app.id, size: app.size, single: app.single, compact }));
  };
  const activate = (app: DesktopApp) => {
    setLaunchpad(false);
    const own = windowsOf(windowsRef.current, app.id);
    if (!own.length) return void open(app);
    const latest = own[own.length - 1];
    if (!latest) return;
    if (top && top.id === latest.id) setWindows(minimiseWindow(windowsRef.current, latest.id));
    else setWindows(focusWindow(windowsRef.current, latest.id));
  };
  const newWindow = (app: DesktopApp) => {
    setLaunchpad(false);
    open(app);
  };

  // A narrow container shows only the top window: the others stay in the list, just out of sight.
  const visibleTop = compact ? top?.id : undefined;

  // Snap preview while dragging.
  const [preview, setPreview] = useState<DesktopSnap | null>(null);
  const gesture = useRef<Gesture | null>(null);

  const areaPoint = (event: { clientX: number; clientY: number }) => {
    const rect = area.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = rtl ? rect.right - event.clientX : event.clientX - rect.left;
    return { x, y: event.clientY - rect.top };
  };

  const beginMove = (event: PointerEvent<HTMLDivElement>, win: DesktopWindowState) => {
    if ((event.target as HTMLElement).closest("button")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const p = areaPoint(event);
    gesture.current = { kind: "move", id: win.id, startX: p.x, startY: p.y, base: win, grab: win.w ? (p.x - win.x) / win.w : 0.5, unsnapped: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    attach();
  };
  const beginResize = (event: PointerEvent<HTMLDivElement>, win: DesktopWindowState, handle: ResizeHandle) => {
    const p = areaPoint(event);
    gesture.current = { kind: "resize", id: win.id, handle, startX: p.x, startY: p.y, base: win };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    attach();
  };

  const onMove = useRef<(event: globalThis.PointerEvent) => void>(() => undefined);
  const onUp = useRef<(event: globalThis.PointerEvent) => void>(() => undefined);
  onMove.current = (event) => {
    const g = gesture.current;
    if (!g) return;
    const p = areaPoint(event);
    const dx = p.x - g.startX;
    const dy = p.y - g.startY;
    const list = windowsRef.current;
    if (g.kind === "resize") {
      const rect = resizeRect(g.base, g.handle, dx, dy);
      setWindows(patchWindow(list, g.id, rect));
      return;
    }
    let base = g.base;
    if ((base.maximised || base.snap) && Math.abs(dx) + Math.abs(dy) > 4) {
      const restored = unsnapForDrag(base, p.x, p.y, g.grab, boundsRef.current);
      g.base = restored;
      g.startX = p.x;
      g.startY = p.y;
      g.unsnapped = true;
      base = restored;
      setWindows(windowsRef.current.map((w) => (w.id === g.id ? restored : w)));
      return;
    }
    if (base.maximised || base.snap) return;
    const next = clampRect({ x: base.x + dx, y: base.y + dy, w: base.w, h: base.h }, boundsRef.current);
    setWindows(patchWindow(list, g.id, next));
    setPreview(snapZone(p, boundsRef.current));
  };
  onUp.current = (event) => {
    const g = gesture.current;
    gesture.current = null;
    detach();
    if (!g) return;
    setPreview(null);
    if (g.kind === "move") {
      const zone = snapZone(areaPoint(event), boundsRef.current);
      if (zone) setWindows(snapWindow(windowsRef.current, g.id, zone, boundsRef.current));
    }
  };
  const moveListener = (event: globalThis.PointerEvent) => onMove.current(event);
  const upListener = (event: globalThis.PointerEvent) => onUp.current(event);
  function attach() {
    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
    window.addEventListener("pointercancel", upListener);
  }
  function detach() {
    window.removeEventListener("pointermove", moveListener);
    window.removeEventListener("pointerup", upListener);
    window.removeEventListener("pointercancel", upListener);
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: detach only removes stable listeners
  useEffect(() => detach, []);

  // When the container shrinks, a floating window is pulled back inside it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the size matters
  useEffect(() => {
    const list = windowsRef.current;
    let changed = false;
    const next = list.map((w) => {
      if (w.maximised || w.snap) {
        const r = w.snap ? snapRect(w.snap, bounds) : snapRect("top", bounds);
        if (r.w !== w.w || r.h !== w.h || r.x !== w.x) {
          changed = true;
          return { ...w, ...r };
        }
        return w;
      }
      const c = clampRect(w, bounds);
      if (c.x !== w.x || c.y !== w.y) {
        changed = true;
        return { ...w, ...c };
      }
      return w;
    });
    if (changed) setWindows(next);
  }, [bounds.w, bounds.h]);

  const previewRect = preview ? snapRect(preview, bounds) : null;

  return (
    <div
      data-slot="desktop-shell"
      data-compact={compact ? "" : undefined}
      className={cn("relative isolate flex h-full min-h-96 w-full flex-col overflow-hidden bg-background text-foreground", className)}
      {...props}
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        {wallpaper ?? <div className="size-full bg-[radial-gradient(120%_90%_at_20%_0%,color-mix(in_oklab,var(--nq-action)_28%,transparent),transparent_60%),radial-gradient(90%_80%_at_100%_100%,color-mix(in_oklab,var(--nq-success)_22%,transparent),transparent_60%)]" />}
      </div>
      <DesktopMenuBar appName={focusedApp?.title} menus={menuList} start={menuBarStart} end={menuBarEnd} labels={labels} />
      <div ref={area} role="region" aria-label={t.desktop} className="relative min-h-0 flex-1">
        {children ? <div className="absolute inset-0">{children}</div> : null}
        {previewRect ? (
          <div
            data-slot="desktop-snap-preview"
            aria-hidden
            className="pointer-events-none absolute rounded-xl border-2 border-primary/60 bg-primary/10"
            style={{ insetInlineStart: previewRect.x + 6, top: previewRect.y + 6, width: previewRect.w - 12, height: previewRect.h - 12, zIndex: 800 }}
          />
        ) : null}
        {windows.map((win, index) => {
          const app = appOf(win.appId);
          if (!app) return null;
          const shown = compact ? { ...win, x: 0, y: 0, w: size.w, h: size.h, maximised: true } : win;
          return (
            <WindowFrame
              key={win.id}
              win={visibleTop !== undefined && visibleTop !== win.id ? { ...shown, minimised: true } : shown}
              app={app}
              focused={top?.id === win.id}
              compact={compact}
              z={10 + index}
              t={t}
              onFocus={() => setWindows(focusWindow(windowsRef.current, win.id))}
              onClose={() => setWindows(closeWindow(windowsRef.current, win.id))}
              onMinimise={() => setWindows(minimiseWindow(windowsRef.current, win.id))}
              onToggleMaximise={() => setWindows(toggleMaximise(windowsRef.current, win.id, boundsRef.current))}
              onDragStart={(event) => beginMove(event, win)}
              onResizeStart={(event, handle) => beginResize(event, win, handle)}
            />
          );
        })}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[850] flex justify-center px-2">
          <DesktopDock
            className="pointer-events-auto max-w-full overflow-x-auto"
            apps={apps}
            windows={windows}
            onActivate={activate}
            onNewWindow={newWindow}
            onCloseAll={(app) => setWindows(windowsRef.current.filter((w) => w.appId !== app.id))}
            onLaunchpad={() => setLaunchpad(!launchpadOpen)}
            launchpadOpen={launchpadOpen}
            labels={labels}
          />
        </div>
        {launchpadOpen ? <DesktopLaunchpad apps={apps} onSelect={activate} onClose={() => setLaunchpad(false)} labels={labels} /> : null}
      </div>
    </div>
  );
}
