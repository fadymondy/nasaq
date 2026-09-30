"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;
export const PopoverClose = BasePopover.Close;

export interface PopoverContentProps extends ComponentProps<typeof BasePopover.Popup> {
  /** Prefer "inline-start" / "inline-end" over physical "left" / "right": the logical sides mirror in RTL. */
  side?: ComponentProps<typeof BasePopover.Positioner>["side"];
  align?: ComponentProps<typeof BasePopover.Positioner>["align"];
  sideOffset?: number;
}

export function PopoverContent({ className, side = "bottom", align = "center", sideOffset = 6, ...props }: PopoverContentProps) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <BasePopover.Popup
          data-slot="popover-content"
          className={cn(
            "w-72 max-w-[var(--available-width)] rounded-floating border border-border bg-popover p-4 text-body-sm text-popover-foreground shadow-floating outline-none",
            "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
            className as string,
          )}
          {...props}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

export function PopoverTitle({ className, ...props }: ComponentProps<typeof BasePopover.Title>) {
  return <BasePopover.Title data-slot="popover-title" className={cn("text-body-sm font-semibold text-foreground", className as string)} {...props} />;
}

export function PopoverDescription({ className, ...props }: ComponentProps<typeof BasePopover.Description>) {
  return <BasePopover.Description data-slot="popover-description" className={cn("mt-1 text-body-sm text-muted-foreground", className as string)} {...props} />;
}
