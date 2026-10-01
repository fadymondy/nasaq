// Pure helpers for desktop-icons (a copy of the Vue and React logic; no framework). Positions are the inline-start and top offset in pixels.

export interface DesktopIconPosition {
  x: number;
  y: number;
}

/** auto opens on double-click with a mouse and on a single tap on touch screens. */
export type DesktopIconOpenOn = "auto" | "click" | "double-click";

export const DESKTOP_ICON_CELL = { w: 96, h: 108, gap: 8 } as const;

/** The cell an icon takes in free mode when it has no saved position: columns from the inline-start, top to bottom. */
export function desktopIconSlot(index: number, height: number): DesktopIconPosition {
  const { w, h, gap } = DESKTOP_ICON_CELL;
  const perColumn = Math.max(1, Math.floor((height - gap) / h));
  return { x: gap + Math.floor(index / perColumn) * w, y: gap + (index % perColumn) * h };
}

export function snapTo({ x, y }: DesktopIconPosition): DesktopIconPosition {
  const { w, h, gap } = DESKTOP_ICON_CELL;
  return { x: gap + Math.max(0, Math.round((x - gap) / w)) * w, y: gap + Math.max(0, Math.round((y - gap) / h)) * h };
}
