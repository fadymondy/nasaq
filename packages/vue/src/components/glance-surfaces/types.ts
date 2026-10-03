import type { Component, VNodeChild } from "vue";
import type { WidgetSize } from "./strings";

export interface TrayPopoverAction {
  id: string;
  label: string;
  /** A lucide icon component. */
  icon?: Component;
  /** Called when the action is chosen. The popover also emits `action` with the id. */
  onSelect?: () => void;
  shortcut?: string;
  danger?: boolean;
}

export interface WidgetDefinition {
  id: string;
  title: string;
  description?: string;
  /** Sizes this widget comes in. */
  sizes: readonly WidgetSize[];
  /** Renders the live preview at a size. Return a `NqWidgetTile` vnode. The `preview` slot wins when both are set. */
  preview?: (size: WidgetSize) => VNodeChild;
}
