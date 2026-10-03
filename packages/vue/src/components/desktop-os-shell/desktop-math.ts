/**
 * Pure window-manager logic for the desktop shell. All x values are measured from the inline start edge of the
 * desktop (the left in English, the right in Arabic), so the shell mirrors without any of this code knowing.
 * The window list is ordered back to front: the last window is on top.
 */

export interface DesktopRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DesktopSnap = "start" | "end" | "top";

export interface DesktopWindowState extends DesktopRect {
  id: string;
  appId: string;
  minimised: boolean;
  maximised: boolean;
  /** Set while the window fills half the desktop. */
  snap: DesktopSnap | null;
  /** The size and place to go back to when un-maximised or un-snapped. */
  restore: DesktopRect | null;
}

export interface DesktopBounds {
  w: number;
  h: number;
}

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const MIN_WINDOW = { w: 280, h: 180 };
/** How much of a title bar must stay reachable when a window is dragged toward an edge. */
const GRAB = 72;

/** Which snap zone a pointer at (x, y) is in: the top edge maximises, the inline edges take half the desktop. */
export function snapZone(point: { x: number; y: number }, bounds: DesktopBounds, edge = 12): DesktopSnap | null {
  if (point.y <= edge) return "top";
  if (point.x <= edge) return "start";
  if (point.x >= bounds.w - edge) return "end";
  return null;
}

export function snapRect(zone: DesktopSnap, bounds: DesktopBounds): DesktopRect {
  if (zone === "top") return { x: 0, y: 0, w: bounds.w, h: bounds.h };
  const half = Math.floor(bounds.w / 2);
  return zone === "start" ? { x: 0, y: 0, w: half, h: bounds.h } : { x: bounds.w - half, y: 0, w: half, h: bounds.h };
}

/** Keeps a window reachable: the title bar can never leave the desktop entirely. */
export function clampRect(rect: DesktopRect, bounds: DesktopBounds): DesktopRect {
  const y = Math.max(0, Math.min(rect.y, Math.max(0, bounds.h - 40)));
  const x = Math.max(GRAB - rect.w, Math.min(rect.x, bounds.w - GRAB));
  return { ...rect, x, y };
}

/** Applies a pointer delta to one resize handle, respecting the minimum size and the top edge. */
export function resizeRect(rect: DesktopRect, handle: ResizeHandle, dx: number, dy: number, min = MIN_WINDOW): DesktopRect {
  let { x, y, w, h } = rect;
  if (handle.includes("e")) w = Math.max(min.w, rect.w + dx);
  if (handle.includes("w")) {
    w = Math.max(min.w, rect.w - dx);
    x = rect.x + (rect.w - w);
  }
  if (handle.includes("s")) h = Math.max(min.h, rect.h + dy);
  if (handle.includes("n")) {
    h = Math.max(min.h, rect.h - dy);
    y = rect.y + (rect.h - h);
  }
  if (y < 0) {
    if (handle.includes("n")) h += y;
    y = 0;
  }
  return { x, y, w, h };
}

/** A cascading start position for the nth window, kept on screen. */
export function cascadeRect(index: number, size: { w: number; h: number }, bounds: DesktopBounds): DesktopRect {
  const w = Math.min(size.w, bounds.w);
  const h = Math.min(size.h, bounds.h);
  const step = 28;
  const slots = Math.max(1, Math.floor(Math.min(bounds.w - w, bounds.h - h) / step) + 1);
  const n = index % slots;
  const x = Math.max(0, Math.min(bounds.w - w, Math.round((bounds.w - w) / 2) - 3 * step + n * step));
  const y = Math.max(0, Math.min(bounds.h - h, 24 + n * step));
  return { x, y, w, h };
}

export function windowsOf(windows: readonly DesktopWindowState[], appId: string): DesktopWindowState[] {
  return windows.filter((w) => w.appId === appId);
}

/** The window that has focus: the topmost one that is not minimised. */
export function focusedWindow(windows: readonly DesktopWindowState[]): DesktopWindowState | undefined {
  for (let i = windows.length - 1; i >= 0; i--) {
    const w = windows[i];
    if (w && !w.minimised) return w;
  }
  return undefined;
}

export function nextWindowId(windows: readonly DesktopWindowState[], appId: string): string {
  let max = 0;
  for (const w of windows) {
    if (w.appId !== appId) continue;
    const n = Number(w.id.slice(appId.length + 1));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${appId}-${max + 1}`;
}

export interface OpenOptions {
  appId: string;
  size?: { w: number; h: number };
  /** One window per app: opening again focuses (and restores) the existing one. */
  single?: boolean;
  /** A small screen shows every window full size. */
  compact?: boolean;
}

export function focusWindow(windows: readonly DesktopWindowState[], id: string): DesktopWindowState[] {
  const win = windows.find((w) => w.id === id);
  if (!win) return [...windows];
  if (!win.minimised && windows[windows.length - 1] === win) return [...windows];
  return [...windows.filter((w) => w !== win), { ...win, minimised: false }];
}

export function openWindow(windows: readonly DesktopWindowState[], bounds: DesktopBounds, opts: OpenOptions): DesktopWindowState[] {
  if (opts.single) {
    const existing = windowsOf(windows, opts.appId)[0];
    if (existing) return focusWindow(windows, existing.id);
  }
  const size = opts.size ?? { w: 640, h: 420 };
  const rect = opts.compact ? { x: 0, y: 0, w: bounds.w, h: bounds.h } : cascadeRect(windowsOf(windows, opts.appId).length + windows.length, size, bounds);
  const win: DesktopWindowState = {
    id: nextWindowId(windows, opts.appId),
    appId: opts.appId,
    ...rect,
    minimised: false,
    maximised: !!opts.compact,
    snap: null,
    restore: opts.compact ? cascadeRect(0, size, bounds) : null,
  };
  return [...windows, win];
}

export function closeWindow(windows: readonly DesktopWindowState[], id: string): DesktopWindowState[] {
  return windows.filter((w) => w.id !== id);
}

export function minimiseWindow(windows: readonly DesktopWindowState[], id: string): DesktopWindowState[] {
  return windows.map((w) => (w.id === id ? { ...w, minimised: true } : w));
}

/** Maximises, or goes back to the size and place it had. A snapped window also goes back. */
export function toggleMaximise(windows: readonly DesktopWindowState[], id: string, bounds: DesktopBounds): DesktopWindowState[] {
  return windows.map((w) => {
    if (w.id !== id) return w;
    if (w.maximised || w.snap) {
      const r = w.restore ?? { x: 40, y: 40, w: 640, h: 420 };
      return { ...w, ...r, maximised: false, snap: null, restore: null };
    }
    return { ...w, ...snapRect("top", bounds), maximised: true, snap: null, restore: { x: w.x, y: w.y, w: w.w, h: w.h } };
  });
}

export function snapWindow(windows: readonly DesktopWindowState[], id: string, zone: DesktopSnap, bounds: DesktopBounds): DesktopWindowState[] {
  return windows.map((w) => {
    if (w.id !== id) return w;
    const restore = w.restore ?? { x: w.x, y: w.y, w: w.w, h: w.h };
    return { ...w, ...snapRect(zone, bounds), maximised: zone === "top", snap: zone === "top" ? null : zone, restore };
  });
}

/**
 * Starting a drag on a maximised or snapped window pulls it back to its old size, under the pointer at the same
 * fraction of the title bar it was grabbed at.
 */
export function unsnapForDrag(win: DesktopWindowState, pointerX: number, pointerY: number, grabFraction: number, bounds: DesktopBounds): DesktopWindowState {
  if (!win.maximised && !win.snap) return win;
  const r = win.restore ?? { x: 40, y: 40, w: 640, h: 420 };
  const w = Math.min(r.w, bounds.w);
  const x = Math.max(0, Math.min(bounds.w - w, Math.round(pointerX - w * grabFraction)));
  return { ...win, x, y: Math.max(0, pointerY - 16), w, h: Math.min(r.h, bounds.h), maximised: false, snap: null, restore: null };
}

export function patchWindow(windows: readonly DesktopWindowState[], id: string, rect: Partial<DesktopRect>): DesktopWindowState[] {
  return windows.map((w) => (w.id === id ? { ...w, ...rect, maximised: false, snap: null } : w));
}

/** Case-insensitive match on the app title or keywords, for the launchpad search. */
export function filterApps<T extends { title: string; keywords?: readonly string[] }>(apps: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...apps];
  return apps.filter((a) => a.title.toLowerCase().includes(q) || a.keywords?.some((k) => k.toLowerCase().includes(q)));
}
