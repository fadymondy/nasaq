/** Internal: class lists shared by DropdownMenu and ContextMenu. Not exported from the package. */
export const menuPopupClass = [
  "z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none",
  "max-h-[var(--available-height)] overflow-y-auto",
  "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
];

export const menuItemClass = [
  "relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control px-2.5 text-body-sm text-foreground outline-none",
  "data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50",
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
];
