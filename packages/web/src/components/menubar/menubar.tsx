"use client";

import { Menu } from "@base-ui/react/menu";
import { Menubar as BaseMenubar } from "@base-ui/react/menubar";
import { Check, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { menuItemClass, menuPopupClass } from "../dropdown-menu/menu-styles";
import { Icon } from "../icon";
import { Kbd } from "../text";

export const MenubarMenu = Menu.Root;
export const MenubarGroup = Menu.Group;
export const MenubarRadioGroup = Menu.RadioGroup;
export const MenubarSub = Menu.SubmenuRoot;

/**
 * The bar. Arrow keys move between the triggers by reading direction (Left and Right swap in RTL), and once one
 * menu is open, hovering or arrowing to a neighbouring trigger opens that menu.
 */
export function Menubar({ className, ...props }: ComponentProps<typeof BaseMenubar>) {
  return (
    <BaseMenubar
      data-slot="menubar"
      className={cn("flex h-control w-fit items-center gap-0.5 rounded-control border border-border bg-card p-0.5 text-foreground", className as string)}
      {...props}
    />
  );
}

export function MenubarTrigger({ className, ...props }: ComponentProps<typeof Menu.Trigger>) {
  return (
    <Menu.Trigger
      data-slot="menubar-trigger"
      className={cn(
        "inline-flex h-full min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center rounded-control px-2.5 text-label text-foreground outline-none",
        "hover:bg-nq-hover data-popup-open:bg-nq-selected focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className as string,
      )}
      {...props}
    />
  );
}

interface PositionProps {
  side?: ComponentProps<typeof Menu.Positioner>["side"];
  align?: ComponentProps<typeof Menu.Positioner>["align"];
  sideOffset?: number;
}

export interface MenubarContentProps extends ComponentProps<typeof Menu.Popup>, PositionProps {}

export function MenubarContent({ className, side = "bottom", align = "start", sideOffset = 6, ...props }: MenubarContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <Menu.Popup data-slot="menubar-content" className={cn(menuPopupClass, "min-w-56", className as string)} {...props} />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

/** A shortcut as one string ("⌘S") or a list of keys (["Ctrl", "S"]). Always left-to-right. */
export function MenubarShortcut({ className, keys, children, ...props }: ComponentProps<"span"> & { keys?: readonly string[] }) {
  return (
    <span data-slot="menubar-shortcut" dir="ltr" className={cn("ms-auto inline-flex items-center gap-1 ps-6", className)} {...props}>
      {keys ? keys.map((key) => <Kbd key={key}>{key}</Kbd>) : typeof children === "string" ? <Kbd>{children}</Kbd> : children}
    </span>
  );
}

export interface MenubarItemProps extends ComponentProps<typeof Menu.Item> {
  variant?: "default" | "danger";
  /** Shown at the inline end with `Kbd`: a string ("⌘S") or a key list (["Ctrl", "S"]). */
  shortcut?: string | readonly string[];
}

function Shortcut({ shortcut }: { shortcut?: string | readonly string[] }) {
  if (!shortcut) return null;
  return typeof shortcut === "string" ? <MenubarShortcut>{shortcut}</MenubarShortcut> : <MenubarShortcut keys={shortcut} />;
}

export function MenubarItem({ className, variant = "default", shortcut, children, ...props }: MenubarItemProps) {
  return (
    <Menu.Item
      data-slot="menubar-item"
      data-variant={variant}
      className={cn(menuItemClass, variant === "danger" && "text-nq-danger-text [&_svg]:text-current", className as string)}
      {...props}
    >
      {children}
      <Shortcut shortcut={shortcut} />
    </Menu.Item>
  );
}

export interface MenubarCheckboxItemProps extends ComponentProps<typeof Menu.CheckboxItem> {
  shortcut?: string | readonly string[];
}

export function MenubarCheckboxItem({ className, children, shortcut, ...props }: MenubarCheckboxItemProps) {
  return (
    <Menu.CheckboxItem data-slot="menubar-checkbox-item" className={cn(menuItemClass, "ps-8", className as string)} {...props}>
      <span aria-hidden="true" className="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <Menu.CheckboxItemIndicator>
          <Check />
        </Menu.CheckboxItemIndicator>
      </span>
      {children}
      <Shortcut shortcut={shortcut} />
    </Menu.CheckboxItem>
  );
}

export function MenubarRadioItem({ className, children, ...props }: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem data-slot="menubar-radio-item" className={cn(menuItemClass, "ps-8", className as string)} {...props}>
      <span aria-hidden="true" className="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <Menu.RadioItemIndicator>
          <span className="block size-1.5 rounded-full bg-current" />
        </Menu.RadioItemIndicator>
      </span>
      {children}
    </Menu.RadioItem>
  );
}

/** Must be rendered inside a MenubarGroup. */
export function MenubarLabel({ className, ...props }: ComponentProps<typeof Menu.GroupLabel>) {
  return <Menu.GroupLabel data-slot="menubar-label" className={cn("px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground", className as string)} {...props} />;
}

export function MenubarSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator data-slot="menubar-separator" className={cn("-mx-1.5 my-1.5 h-px bg-border", className as string)} {...props} />;
}

export function MenubarSubTrigger({ className, children, ...props }: ComponentProps<typeof Menu.SubmenuTrigger>) {
  return (
    <Menu.SubmenuTrigger data-slot="menubar-sub-trigger" className={cn(menuItemClass, "data-popup-open:bg-nq-selected", className as string)} {...props}>
      {children}
      <Icon icon={ChevronRight} directional className="ms-auto" />
    </Menu.SubmenuTrigger>
  );
}

export interface MenubarSubContentProps extends ComponentProps<typeof Menu.Popup>, PositionProps {}

export function MenubarSubContent({ className, side = "inline-end", align = "start", sideOffset = -4, ...props }: MenubarSubContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} alignOffset={-4} className="z-50 outline-none">
        <Menu.Popup data-slot="menubar-sub-content" className={cn(menuPopupClass, className as string)} {...props} />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

