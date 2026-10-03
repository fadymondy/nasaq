import type { Component } from "vue";
import { NqContextMenuItem, NqContextMenuSeparator, NqContextMenuSub, NqContextMenuSubContent, NqContextMenuSubTrigger } from "../context-menu";
import { NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuSub, NqDropdownMenuSubContent, NqDropdownMenuSubTrigger } from "../dropdown-menu";

/** The menu parts a list of choices is built from, so the more menu and the context menu share one definition. */
type Kit = Record<"Item" | "Separator" | "Sub" | "SubTrigger" | "SubContent", Component>;
export const MENU_KITS: { dropdown: Kit; context: Kit } = {
  dropdown: { Item: NqDropdownMenuItem, Separator: NqDropdownMenuSeparator, Sub: NqDropdownMenuSub, SubTrigger: NqDropdownMenuSubTrigger, SubContent: NqDropdownMenuSubContent },
  context: { Item: NqContextMenuItem, Separator: NqContextMenuSeparator, Sub: NqContextMenuSub, SubTrigger: NqContextMenuSubTrigger, SubContent: NqContextMenuSubContent },
};
export type MenuKitName = keyof typeof MENU_KITS;
