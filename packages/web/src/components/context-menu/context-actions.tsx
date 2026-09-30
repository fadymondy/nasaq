"use client";

import { cloneElement, isValidElement, type ElementType, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode, useRef } from "react";
import { cn } from "../../lib/cn";
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "./context-menu";
import { type ContextMenuAction, groupActions, keyboardMenuPoint, NATIVE_CONTEXT_SELECTOR } from "./context-actions-helpers";

export { type ContextMenuAction, groupActions, keyboardMenuPoint } from "./context-actions-helpers";

function actionIcon(icon: ContextMenuAction["icon"]): ReactNode {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  const Glyph = icon as ElementType;
  return <Glyph aria-hidden />;
}

export interface ContextMenuActionsProps<A extends ContextMenuAction = ContextMenuAction> {
  /** The same list a row's "…" menu shows. An empty list (or `disabled`) leaves the element untouched. */
  actions: readonly A[];
  /** Renders each action's icon. Default: the action's `icon`. */
  renderIcon?: (action: A) => ReactNode;
  disabled?: boolean;
  /** The element that becomes the trigger (a `<tr>`, `<li>`, a card…). It keeps its own props and children. */
  render: ReactElement;
  children?: ReactNode;
  className?: string;
  /**
   * The focusable element inside the trigger that gets focus back when the menu closes (a card's button, a list
   * row's link). Default: the trigger element itself, which is right when it is focusable (a table row).
   */
  focusTarget?: (trigger: HTMLElement) => HTMLElement | null | undefined;
  /**
   * Also open on Shift+F10 and the Menu key, at the focused element. Default true. Turn off when the trigger's own
   * key handler already calls `openContextMenuAt` (DataTable does, to fall back to its ⋯ button).
   */
  keyboard?: boolean;
}

/**
 * Turns any element into a context-menu region driven by an action list: context-click, long-press, Shift+F10 or the
 * Menu key (see `openContextMenuAt`). Right-clicks on inputs, textareas, selects, links and editable text keep the
 * browser's own menu, and so does Shift+context-click. Focus returns to the element when the menu closes.
 */
export function ContextMenuActions<A extends ContextMenuAction>({
  actions,
  renderIcon,
  disabled,
  render,
  children,
  className,
  focusTarget,
  keyboard = true,
}: ContextMenuActionsProps<A>) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const inner = children ?? (render.props as { children?: ReactNode }).children;
  if (disabled || !actions.length || !isValidElement(render)) return cloneElement(render, undefined, inner);
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={render}
        ref={triggerRef as never}
        className={cn("data-popup-open:bg-nq-hover", className)}
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          if (!keyboard || event.defaultPrevented) return;
          if (!((event.key === "F10" && event.shiftKey) || event.key === "ContextMenu")) return;
          const target = event.target as HTMLElement;
          if (target.closest(NATIVE_CONTEXT_SELECTOR)) return;
          if (openContextMenuAt(target)) event.preventDefault();
        }}
        onContextMenu={(event: MouseEvent<HTMLElement>) => {
          const target = event.target as HTMLElement;
          const native = target.closest(NATIVE_CONTEXT_SELECTOR);
          if (event.shiftKey || (native && event.currentTarget.contains(native))) {
            // Leave it to the browser: stop Base UI's handler and its document-level preventDefault.
            (event as unknown as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
            event.nativeEvent.stopPropagation();
          }
        }}
      >
        {inner}
      </ContextMenuTrigger>
      <ContextMenuContent
        className="min-w-44"
        finalFocus={() => (triggerRef.current && focusTarget ? focusTarget(triggerRef.current) : null) ?? true}
      >
        {groupActions(actions).map((items, i) => (
          <ContextMenuGroup key={i}>
            {i > 0 ? <ContextMenuSeparator /> : null}
            {items.map((a) => (
              <ContextMenuItem key={a.id} variant={a.danger ? "danger" : "default"} disabled={a.disabled} onClick={a.onSelect}>
                {renderIcon ? renderIcon(a) : actionIcon(a.icon)}
                {a.label}
              </ContextMenuItem>
            ))}
          </ContextMenuGroup>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Opens the context menu of `element` as if it were context-clicked at its inline start, for Shift+F10 and the Menu
 * key. Returns false when nothing handled it (no menu on that element), so callers can fall back.
 */
export function openContextMenuAt(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const rtl = getComputedStyle(element).direction === "rtl";
  const { x, y } = keyboardMenuPoint(rect, rtl);
  const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, view: window });
  element.dispatchEvent(event);
  return event.defaultPrevented;
}
