/** Where a plugin or module shows up in the app shell. */
export type PlacementMode = "sidebar" | "header" | "sideover" | "fixed" | "hidden";

export const PLACEMENT_MODES: readonly PlacementMode[] = ["sidebar", "header", "sideover", "fixed", "hidden"];

/** Modes only some items may use (a floating panel or widget on every page). */
export const OVERLAY_MODES: readonly PlacementMode[] = ["sideover", "fixed"];

export interface PlacementValue {
  mode: PlacementMode;
  /** Position among its neighbours; lower comes first. */
  order: number;
  /** Open this item when the app opens. Only for modes with a page (`canBeDefaultPage`). */
  defaultPage?: boolean;
}

/** Only items with a page in the navigation can be the landing page. */
export const canBeDefaultPage = (mode: PlacementMode): boolean => mode === "sidebar" || mode === "header";

/** Whether a mode can be picked, given whether overlay modes are allowed. */
export const isModeAvailable = (mode: PlacementMode, allowOverlays: boolean): boolean => allowOverlays || !OVERLAY_MODES.includes(mode);

/** A whole, non-negative order from what was typed, or `null` while it is not a number. */
export function parseOrder(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

/** Picks a mode, switching the landing page off when the new mode cannot have one. */
export function withMode(value: PlacementValue, mode: PlacementMode): PlacementValue {
  return { ...value, mode, defaultPage: canBeDefaultPage(mode) ? value.defaultPage : false };
}

/** Only the fields that changed from `initial`; empty when nothing did. `defaultPage` counts only when `allowDefaultPage`. */
export function placementChanges(initial: PlacementValue, current: PlacementValue, allowDefaultPage = true): Partial<PlacementValue> {
  const out: Partial<PlacementValue> = {};
  if (current.mode !== initial.mode) out.mode = current.mode;
  if (current.order !== initial.order) out.order = current.order;
  if (allowDefaultPage && Boolean(current.defaultPage) !== Boolean(initial.defaultPage)) out.defaultPage = Boolean(current.defaultPage);
  return out;
}
