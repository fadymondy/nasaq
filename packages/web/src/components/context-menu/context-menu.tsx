"use client";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import type { DropdownMenuItemProps } from "../dropdown-menu";
import { DropdownMenuShortcut } from "../dropdown-menu";
import { menuItemClass, menuPopupClass } from "../dropdown-menu/menu-styles";
import { Icon } from "../icon";

export const ContextMenu = BaseContextMenu.Root;
/** The region that opens the menu on secondary click or long-press. Style it with `className`. */
export const ContextMenuTrigger = BaseContextMenu.Trigger;
export const ContextMenuGroup = BaseContextMenu.Group;
export const ContextMenuRadioGroup = BaseContextMenu.RadioGroup;
export const ContextMenuSub = BaseContextMenu.SubmenuRoot;
export const ContextMenuShortcut = DropdownMenuShortcut;

export type ContextMenuContentProps = ComponentProps<typeof BaseContextMenu.Popup>;

/** Opens at the pointer; the positioner picks the side and flips automatically (RTL aware). */
export function ContextMenuContent({ className, ...props }: ContextMenuContentProps) {
  return (
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner className="z-50 outline-none">
        <BaseContextMenu.Popup data-slot="context-menu-content" className={cn(menuPopupClass, className as string)} {...props} />
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  );
}

export type ContextMenuItemProps = DropdownMenuItemProps;

export function ContextMenuItem({ className, variant = "default", shortcut, children, ...props }: ContextMenuItemProps) {
  return (
    <BaseContextMenu.Item
      data-slot="context-menu-item"
      data-variant={variant}
      className={cn(menuItemClass, variant === "danger" && "text-nq-danger-text [&_svg]:text-current", className as string)}
      {...props}
    >
      {children}
      {shortcut ? <ContextMenuShortcut>{shortcut}</ContextMenuShortcut> : null}
    </BaseContextMenu.Item>
  );
}

export function ContextMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof BaseContextMenu.CheckboxItem>) {
  return (
    <BaseContextMenu.CheckboxItem data-slot="context-menu-checkbox-item" className={cn(menuItemClass, "ps-8", className as string)} {...props}>
      <span aria-hidden="true" className="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <BaseContextMenu.CheckboxItemIndicator>
          <Check />
        </BaseContextMenu.CheckboxItemIndicator>
      </span>
      {children}
    </BaseContextMenu.CheckboxItem>
  );
}

export function ContextMenuRadioItem({ className, children, ...props }: ComponentProps<typeof BaseContextMenu.RadioItem>) {
  return (
    <BaseContextMenu.RadioItem data-slot="context-menu-radio-item" className={cn(menuItemClass, "ps-8", className as string)} {...props}>
      <span aria-hidden="true" className="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <BaseContextMenu.RadioItemIndicator>
          <span className="block size-1.5 rounded-full bg-current" />
        </BaseContextMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseContextMenu.RadioItem>
  );
}

/** Must be rendered inside a ContextMenuGroup (Base UI GroupLabel reads the group context). */
export function ContextMenuLabel({ className, ...props }: ComponentProps<typeof BaseContextMenu.GroupLabel>) {
  return <BaseContextMenu.GroupLabel data-slot="context-menu-label" className={cn("px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground", className as string)} {...props} />;
}

export function ContextMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator data-slot="context-menu-separator" className={cn("-mx-1.5 my-1.5 h-px bg-border", className as string)} {...props} />;
}

export function ContextMenuSubTrigger({ className, children, ...props }: ComponentProps<typeof BaseContextMenu.SubmenuTrigger>) {
  return (
    <BaseContextMenu.SubmenuTrigger data-slot="context-menu-sub-trigger" className={cn(menuItemClass, "data-popup-open:bg-nq-selected", className as string)} {...props}>
      {children}
      <Icon icon={ChevronRight} directional className="ms-auto" />
    </BaseContextMenu.SubmenuTrigger>
  );
}

export interface ContextMenuSubContentProps extends ComponentProps<typeof Menu.Popup> {
  side?: ComponentProps<typeof Menu.Positioner>["side"];
  align?: ComponentProps<typeof Menu.Positioner>["align"];
  sideOffset?: number;
}

export function ContextMenuSubContent({ className, side = "inline-end", align = "start", sideOffset = -4, ...props }: ContextMenuSubContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} alignOffset={-4} className="z-50 outline-none">
        <Menu.Popup data-slot="context-menu-sub-content" className={cn(menuPopupClass, className as string)} {...props} />
      </Menu.Positioner>
    </Menu.Portal>
  );
}
