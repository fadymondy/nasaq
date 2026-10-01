import { cn } from "../../lib/cn";

/** The row every sidebar item, nest trigger and flyout trigger shares. */
export const sidebarItemClass = (active: boolean) =>
  cn(
    "relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] w-full items-center gap-2 rounded-control px-2 text-start text-body-sm text-sidebar-foreground",
    "transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground",
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    "group-data-collapsed/sidebar:size-control group-data-collapsed/sidebar:justify-center group-data-collapsed/sidebar:px-0",
    active && "bg-nq-selected font-medium text-foreground",
  );

/** The bottom bar's item, shared by the bar links and the More button. */
export const APP_NAV_BAR_ITEM = cn(
  "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-control px-1 py-1.5 text-caption text-muted-foreground outline-none",
  "transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-5",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
);

export const STATUS_DOT = { success: "bg-nq-success", warning: "bg-nq-warning", danger: "bg-nq-danger", info: "bg-nq-info" } as const;
