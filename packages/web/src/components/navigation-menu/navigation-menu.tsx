"use client";

import { NavigationMenu as BaseNavigationMenu } from "@base-ui/react/navigation-menu";
import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

const triggerClass = [
  "inline-flex h-control min-h-[var(--nq-touch-min,0px)] select-none items-center justify-center gap-1.5 rounded-control px-3 text-label text-foreground no-underline outline-none",
  "transition-colors duration-150 ease-nq hover:bg-nq-hover data-popup-open:bg-nq-selected data-pressed:bg-nq-selected",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
];

export interface NavigationMenuProps extends ComponentProps<typeof BaseNavigationMenu.Root> {
  /** Where the shared panel sits against its trigger. Default `start`. */
  align?: ComponentProps<typeof BaseNavigationMenu.Positioner>["align"];
  /** Gap between the bar and the panel. Default 8. */
  sideOffset?: number;
  /** Class for the panel (the animated viewport). */
  panelClassName?: string;
}

/**
 * A site header menu. Put a `NavigationMenuList` inside; the panel that holds each trigger's
 * `NavigationMenuContent` is rendered for you and is shared, so it grows, shrinks and slides between triggers
 * instead of closing and reopening.
 */
export function NavigationMenu({ className, children, align = "start", sideOffset = 8, panelClassName, ...props }: NavigationMenuProps) {
  return (
    <BaseNavigationMenu.Root data-slot="navigation-menu" className={cn("relative flex w-max max-w-full", className as string)} {...props}>
      {children}
      <BaseNavigationMenu.Portal>
        <BaseNavigationMenu.Positioner
          data-slot="navigation-menu-positioner"
          align={align}
          sideOffset={sideOffset}
          collisionPadding={16}
          collisionAvoidance={{ side: "none" }}
          className={cn(
            "z-50 h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)]",
            "transition-[inset] duration-300 ease-nq motion-reduce:transition-none data-instant:transition-none",
            "before:absolute before:inset-x-0 before:-top-2 before:h-2 before:content-['']",
          )}
        >
          <BaseNavigationMenu.Popup
            data-slot="navigation-menu-popup"
            className={cn(
              "relative h-[var(--popup-height)] w-[var(--popup-width)] origin-[var(--transform-origin)] overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none",
              "transition-[opacity,scale,width,height] duration-300 ease-nq motion-reduce:transition-none",
              "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150",
              panelClassName,
            )}
          >
            <BaseNavigationMenu.Viewport data-slot="navigation-menu-viewport" className="relative h-full w-full overflow-hidden" />
          </BaseNavigationMenu.Popup>
        </BaseNavigationMenu.Positioner>
      </BaseNavigationMenu.Portal>
    </BaseNavigationMenu.Root>
  );
}

export function NavigationMenuList({ className, ...props }: ComponentProps<typeof BaseNavigationMenu.List>) {
  return <BaseNavigationMenu.List data-slot="navigation-menu-list" className={cn("relative m-0 flex list-none items-center gap-0.5 p-0", className as string)} {...props} />;
}

export const NavigationMenuItem = BaseNavigationMenu.Item;

/** The trigger for a mega menu panel. It carries its own chevron, which turns while the panel is open. */
export function NavigationMenuTrigger({ className, children, ...props }: ComponentProps<typeof BaseNavigationMenu.Trigger>) {
  return (
    <BaseNavigationMenu.Trigger data-slot="navigation-menu-trigger" className={cn(triggerClass, className as string)} {...props}>
      {children}
      <BaseNavigationMenu.Icon className="inline-flex transition-transform duration-200 ease-nq data-popup-open:rotate-180 motion-reduce:transition-none">
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      </BaseNavigationMenu.Icon>
    </BaseNavigationMenu.Trigger>
  );
}

/** A top-level link that sits in the bar beside the triggers ("Pricing", "Blog"). */
export function NavigationMenuLink({ className, ...props }: ComponentProps<typeof BaseNavigationMenu.Link>) {
  return <BaseNavigationMenu.Link data-slot="navigation-menu-link" className={cn(triggerClass, "data-active:bg-nq-selected", className as string)} {...props} />;
}

/** The panel body for one trigger. Content fades and slides in from the side the previous panel was on. */
export function NavigationMenuContent({ className, ...props }: ComponentProps<typeof BaseNavigationMenu.Content>) {
  return (
    <BaseNavigationMenu.Content
      data-slot="navigation-menu-content"
      className={cn(
        "h-full w-max min-w-64 max-w-[min(100vw-2rem,52rem)] p-3",
        "transition-[opacity,translate] duration-300 ease-nq motion-reduce:transition-none",
        "data-starting-style:opacity-0 data-ending-style:opacity-0",
        "data-starting-style:data-[activation-direction=left]:-translate-x-1/2 data-starting-style:data-[activation-direction=right]:translate-x-1/2",
        "data-ending-style:data-[activation-direction=left]:translate-x-1/2 data-ending-style:data-[activation-direction=right]:-translate-x-1/2",
        className as string,
      )}
      {...props}
    />
  );
}

/** A list of links inside a panel. `columns` is the number of columns from the `sm` breakpoint up. */
export function NavigationMenuLinkList({ className, columns = 1, ...props }: ComponentProps<"ul"> & { columns?: 1 | 2 | 3 }) {
  return (
    <ul
      data-slot="navigation-menu-link-list"
      className={cn("m-0 grid list-none gap-1 p-0", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3", className)}
      {...props}
    />
  );
}

export interface NavigationMenuLinkItemProps extends Omit<ComponentProps<typeof BaseNavigationMenu.Link>, "title"> {
  /** Link title. */
  title: ReactNode;
  /** One line under the title. */
  description?: ReactNode;
  /** An icon at the inline start. */
  icon?: ReactNode;
}

/** One entry of a link list: an optional icon, a title and a description, as a single link. Renders its own `li`. */
export function NavigationMenuLinkItem({ title, description, icon, className, ...props }: NavigationMenuLinkItemProps) {
  return (
    <li data-slot="navigation-menu-link-item" className="m-0 list-none">
      <BaseNavigationMenu.Link
        className={cn(
          "flex items-start gap-3 rounded-control p-2.5 text-start no-underline outline-none transition-colors duration-150 ease-nq",
          "hover:bg-nq-hover focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-active:bg-nq-selected",
          className as string,
        )}
        {...props}
      >
        {icon ? (
          <span aria-hidden="true" className="mt-0.5 inline-flex shrink-0 text-muted-foreground [&_svg]:size-5">
            {icon}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-label text-foreground">{title}</span>
          {description ? <span className="text-body-sm text-muted-foreground">{description}</span> : null}
        </span>
      </BaseNavigationMenu.Link>
    </li>
  );
}

/** A section title above a link list, for panels with more than one group. */
export function NavigationMenuLabel({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="navigation-menu-label" className={cn("m-0 px-2.5 pb-1 text-caption font-medium text-muted-foreground", className)} {...props} />;
}

/**
 * The featured card slot: a highlighted block next to the link list (a launch, a case study). It is a link, so
 * pass `href`; put any content inside.
 */
export function NavigationMenuFeatured({ className, ...props }: ComponentProps<typeof BaseNavigationMenu.Link>) {
  return (
    <BaseNavigationMenu.Link
      data-slot="navigation-menu-featured"
      className={cn(
        "flex min-w-56 flex-col items-start justify-end gap-1.5 rounded-card border border-border bg-nq-surface-soft p-4 text-start no-underline outline-none transition-colors duration-150 ease-nq",
        "hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
        className as string,
      )}
      {...props}
    />
  );
}

/** Layout for a panel with a link list and a featured card: DOM order is visual order and mirrors in RTL. */
export function NavigationMenuLayout({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="navigation-menu-layout" className={cn("flex flex-col gap-3 sm:flex-row", className)} {...props} />;
}
