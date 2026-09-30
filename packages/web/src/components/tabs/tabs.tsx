"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { type ComponentProps, createContext, use } from "react";
import { cn } from "../../lib/cn";

type TabsVariant = "segmented" | "underline";
const VariantContext = createContext<TabsVariant>("segmented");

/**
 * Switches between views of the same subject (screenshots, a product's sections) without leaving the page.
 * Arrow keys move between tabs and follow the reading direction. Built on Base UI Tabs.
 */
export function Tabs({ className, ...props }: ComponentProps<typeof BaseTabs.Root>) {
  return <BaseTabs.Root data-slot="tabs" className={cn("flex flex-col gap-4", className as string)} {...props} />;
}

export interface TabsListProps extends ComponentProps<typeof BaseTabs.List> {
  /** "segmented" (default): tabs in a tinted track, for a few short options. "underline": a line under the active tab, for page sections. */
  variant?: TabsVariant;
}

/** The row of tabs. Scrolls sideways when it doesn't fit. Put a `TabsIndicator` last inside it. */
export function TabsList({ variant = "segmented", className, children, ...props }: TabsListProps) {
  return (
    <VariantContext value={variant}>
      <BaseTabs.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          "relative z-0 flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          variant === "segmented" ? "w-fit gap-0.5 rounded-control bg-secondary p-0.5" : "gap-4 border-b border-border",
          className as string,
        )}
        {...props}
      >
        {children}
      </BaseTabs.List>
    </VariantContext>
  );
}

/** One tab. Give it the same `value` as its `TabsPanel`. */
export function TabsTab({ className, ...props }: ComponentProps<typeof BaseTabs.Tab>) {
  const variant = use(VariantContext);
  return (
    <BaseTabs.Tab
      data-slot="tabs-tab"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq",
        "hover:text-foreground data-active:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        variant === "segmented" ? "h-7 rounded-[calc(var(--radius-control)-2px)] px-3" : "h-9 px-0.5",
        className as string,
      )}
      {...props}
    />
  );
}

/** The moving highlight behind (segmented) or under (underline) the active tab. */
export function TabsIndicator({ className, ...props }: ComponentProps<typeof BaseTabs.Indicator>) {
  const variant = use(VariantContext);
  return (
    <BaseTabs.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute -z-10 transition-[left,width] duration-200 ease-nq",
        // Base UI measures --active-tab-left physically (px from the left edge) in both directions.
        "left-[var(--active-tab-left)] w-[var(--active-tab-width)]", // nasaq-lint-ignore
        variant === "segmented"
          ? "top-[var(--active-tab-top)] h-[var(--active-tab-height)] rounded-[calc(var(--radius-control)-2px)] bg-background shadow-xs"
          : "bottom-0 h-0.5 rounded-full bg-primary",
        className as string,
      )}
      {...props}
    />
  );
}

/** The content for one tab. */
export function TabsPanel({ className, ...props }: ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel
      data-slot="tabs-panel"
      className={cn("outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus", className as string)}
      {...props}
    />
  );
}
