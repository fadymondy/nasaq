"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronRight } from "lucide-react";
import { type ComponentProps, createContext, type ReactNode, useContext } from "react";
import { cn } from "../../lib/cn";
import { Icon } from "../icon";
import { menuItemClass, menuPopupClass } from "./menu-styles";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
const InGroup = createContext(false);

export function DropdownMenuGroup(props: ComponentProps<typeof Menu.Group>) {
  return (
    <InGroup.Provider value>
      <Menu.Group {...props} />
    </InGroup.Provider>
  );
}
export const DropdownMenuRadioGroup = Menu.RadioGroup;
export const DropdownMenuSub = Menu.SubmenuRoot;

export interface DropdownMenuContentProps extends ComponentProps<typeof Menu.Popup> {
  side?: ComponentProps<typeof Menu.Positioner>["side"];
  align?: ComponentProps<typeof Menu.Positioner>["align"];
  sideOffset?: number;
}

export function DropdownMenuContent({ className, side = "bottom", align = "start", sideOffset = 4, ...props }: DropdownMenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <Menu.Popup data-slot="dropdown-menu-content" className={cn(menuPopupClass, className as string)} {...props} />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export interface DropdownMenuItemProps extends ComponentProps<typeof Menu.Item> {
  variant?: "default" | "danger";
  shortcut?: ReactNode;
}

export function DropdownMenuItem({ className, variant = "default", shortcut, children, ...props }: DropdownMenuItemProps) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(menuItemClass, variant === "danger" && "text-nq-danger-text [&_svg]:text-current", className as string)}
      {...props}
    >
      {children}
      {shortcut ? <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut> : null}
    </Menu.Item>
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof Menu.CheckboxItem>) {
  return (
    <Menu.CheckboxItem data-slot="dropdown-menu-checkbox-item" className={cn(menuItemClass, "ps-8", className as string)} {...props}>
      <span aria-hidden="true" className="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <Menu.CheckboxItemIndicator>
          <Check />
        </Menu.CheckboxItemIndicator>
      </span>
      {children}
    </Menu.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem data-slot="dropdown-menu-radio-item" className={cn(menuItemClass, "ps-8", className as string)} {...props}>
      <span aria-hidden="true" className="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <Menu.RadioItemIndicator>
          <span className="block size-1.5 rounded-full bg-current" />
        </Menu.RadioItemIndicator>
      </span>
      {children}
    </Menu.RadioItem>
  );
}

/**
 * A heading in the menu. Inside a DropdownMenuGroup it names the group (Base UI GroupLabel); anywhere else it is a plain
 * heading, so it never throws for a missing group.
 */
export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.GroupLabel>) {
  const grouped = useContext(InGroup);
  const classes = cn("px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground", className as string);
  if (grouped) return <Menu.GroupLabel data-slot="dropdown-menu-label" className={classes} {...props} />;
  const { render: _render, ...rest } = props;
  return <div data-slot="dropdown-menu-label" role="presentation" className={classes} {...(rest as ComponentProps<"div">)} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1.5 my-1.5 h-px bg-border", className as string)} {...props} />;
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" dir="ltr" className={cn("ms-auto font-mono text-[11px] text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSubTrigger({ className, children, ...props }: ComponentProps<typeof Menu.SubmenuTrigger>) {
  return (
    <Menu.SubmenuTrigger data-slot="dropdown-menu-sub-trigger" className={cn(menuItemClass, "data-popup-open:bg-nq-selected", className as string)} {...props}>
      {children}
      <Icon icon={ChevronRight} directional className="ms-auto" />
    </Menu.SubmenuTrigger>
  );
}

export interface DropdownMenuSubContentProps extends ComponentProps<typeof Menu.Popup> {
  side?: ComponentProps<typeof Menu.Positioner>["side"];
  align?: ComponentProps<typeof Menu.Positioner>["align"];
  sideOffset?: number;
}

export function DropdownMenuSubContent({ className, side = "inline-end", align = "start", sideOffset = -4, ...props }: DropdownMenuSubContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} alignOffset={-4} className="z-50 outline-none">
        <Menu.Popup data-slot="dropdown-menu-sub-content" className={cn(menuPopupClass, className as string)} {...props} />
      </Menu.Positioner>
    </Menu.Portal>
  );
}
