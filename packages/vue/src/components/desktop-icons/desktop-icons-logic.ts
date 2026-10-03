import { computed } from "vue";
import type { Component, VNode } from "vue";
import { useNasaq } from "../../provider";

export const DESKTOP_ICON_STRINGS = {
  en: { desktopIcons: "Desktop", open: "Open", remove: "Remove from desktop" },
  ar: { desktopIcons: "سطح المكتب", open: "فتح", remove: "إزالة من سطح المكتب" },
};

export type DesktopIconsLabels = Partial<(typeof DESKTOP_ICON_STRINGS)["en"]>;

export interface DesktopIconItem {
  id: string;
  title: string;
  /** The tile. A component or vnode; a lucide glyph in a `NqDesktopAppIcon` matches the dock. */
  icon: Component | VNode;
}

/** Inline-start and top offset in pixels, inside the grid's box. */
export interface DesktopIconPosition {
  x: number;
  y: number;
}

/** `auto` opens on double-click with a mouse and on a single tap on touch screens. */
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

export function useDesktopIconsLocale(labels?: () => DesktopIconsLabels | undefined) {
  const nq = useNasaq();
  const ar = computed(() => nq.locale.value.startsWith("ar"));
  const rtl = computed(() => nq.direction.value === "rtl");
  const t = computed(() => ({ ...DESKTOP_ICON_STRINGS[ar.value ? "ar" : "en"], ...labels?.() }));
  return { t, rtl };
}
