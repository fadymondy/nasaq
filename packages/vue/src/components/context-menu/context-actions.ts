// Framework-neutral helpers behind the React ContextMenuActions, copied into the Vue port.
import type { Component } from "vue";

/** The shape shared by row menus and the context menu built from them. */
export interface ContextMenuAction {
  id: string;
  label: string;
  /** A lucide-vue-next icon component. */
  icon?: Component;
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

/** Opens the menu of `element` as if context-clicked at its inline start (Shift+F10 / Menu key). Returns whether a handler took it. */
export function openContextMenuAt(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const rtl = getComputedStyle(element).direction === "rtl";
  const { x, y } = keyboardMenuPoint(rect, rtl);
  const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, view: window });
  element.dispatchEvent(event);
  return event.defaultPrevented;
}
