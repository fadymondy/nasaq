import type { ElementType, ReactElement } from "react";

/** The shape shared by row menus (`DataTableRowAction`) and the context menu built from them. */
export interface ContextMenuAction {
  id: string;
  label: string;
  /** A lucide icon component or a ready element. */
  icon?: ElementType | ReactElement;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Separator between groups, in first-seen order. */
  group?: string;
}

/** Splits actions into groups (first-seen order); the renderer puts a separator between groups. */
export function groupActions<A extends { group?: string }>(actions: readonly A[]): A[][] {
  const groups = new Map<string, A[]>();
  for (const a of actions) {
    const key = a.group ?? "";
    const list = groups.get(key);
    if (list) list.push(a);
    else groups.set(key, [a]);
  }
  return [...groups.values()];
}

/** Elements whose own context-click menu (copy, paste, open link) must keep working. */
export const NATIVE_CONTEXT_SELECTOR = "input,textarea,select,a[href],[contenteditable=true],[contenteditable='']";

/** Where the keyboard-opened menu appears for a focused element: near its inline start, vertically centred. */
export function keyboardMenuPoint(rect: { left: number; right: number; top: number; height: number }, rtl: boolean, inset = 24) {
  return { x: rtl ? rect.right - inset : rect.left + inset, y: rect.top + rect.height / 2 };
}
