"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/**
 * Root. Pass `items` (`{ value, label }[]` or a value→label record) so the trigger shows the label
 * rather than the raw value before the list has ever opened.
 */
export const Select = BaseSelect.Root;
export const SelectGroup = BaseSelect.Group;

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof BaseSelect.Trigger>) {
  return (
    <BaseSelect.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground",
        "min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq",
        "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus",
        "data-invalid:border-nq-danger data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "pointer-coarse:text-[16px]",
        className as string,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
        <ChevronsUpDown />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

export function SelectValue({ className, ...props }: ComponentProps<typeof BaseSelect.Value>) {
  return (
    <BaseSelect.Value
      data-slot="select-value"
      className={cn("min-w-0 flex-1 truncate text-start data-placeholder:text-muted-foreground", className as string)}
      {...props}
    />
  );
}

export interface SelectContentProps extends ComponentProps<typeof BaseSelect.Popup> {
  side?: ComponentProps<typeof BaseSelect.Positioner>["side"];
  align?: ComponentProps<typeof BaseSelect.Positioner>["align"];
  sideOffset?: number;
  /** Overlay the selected item on the trigger (the native select feel). Default false: the list opens below. */
  alignItemWithTrigger?: boolean;
}

export function SelectContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignItemWithTrigger = false,
  ...props
}: SelectContentProps) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="z-50 outline-none"
      >
        <BaseSelect.Popup
          data-slot="select-content"
          className={cn(
            "min-w-[var(--anchor-width)] max-h-[var(--available-height)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none",
            "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
            className as string,
          )}
          {...props}
        >
          <BaseSelect.List>{children}</BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof BaseSelect.Item>) {
  return (
    <BaseSelect.Item
      data-slot="select-item"
      className={cn(
        "relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none",
        "data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50",
        className as string,
      )}
      {...props}
    >
      <span aria-hidden="true" className="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <BaseSelect.ItemIndicator>
          <Check className="size-4" />
        </BaseSelect.ItemIndicator>
      </span>
      <BaseSelect.ItemText className="min-w-0 flex-1 truncate">{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}

/** Must be rendered inside a SelectGroup. */
export function SelectLabel({ className, ...props }: ComponentProps<typeof BaseSelect.GroupLabel>) {
  return (
    <BaseSelect.GroupLabel
      data-slot="select-label"
      className={cn("px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground", className as string)}
      {...props}
    />
  );
}

export function SelectSeparator({ className, ...props }: ComponentProps<typeof BaseSelect.Separator>) {
  return <BaseSelect.Separator data-slot="select-separator" className={cn("-mx-1.5 my-1.5 h-px bg-border", className as string)} {...props} />;
}
