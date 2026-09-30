"use client";

import { PreviewCard } from "@base-ui/react/preview-card";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export const HoverCard = PreviewCard.Root;
/** Takes `delay` (open) and `closeDelay` in ms. Render a link: `render={<a href="…" />}`. */
export const HoverCardTrigger = PreviewCard.Trigger;

export interface HoverCardContentProps extends ComponentProps<typeof PreviewCard.Popup> {
  /** Prefer "inline-start" / "inline-end" over physical "left" / "right": the logical sides mirror in RTL. */
  side?: ComponentProps<typeof PreviewCard.Positioner>["side"];
  align?: ComponentProps<typeof PreviewCard.Positioner>["align"];
  sideOffset?: number;
}

export function HoverCardContent({ className, side = "bottom", align = "center", sideOffset = 6, ...props }: HoverCardContentProps) {
  return (
    <PreviewCard.Portal>
      <PreviewCard.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <PreviewCard.Popup
          data-slot="hover-card-content"
          className={cn(
            "w-72 max-w-[var(--available-width)] rounded-floating border border-border bg-popover p-4 text-body-sm text-popover-foreground shadow-floating outline-none",
            "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
            className as string,
          )}
          {...props}
        />
      </PreviewCard.Positioner>
    </PreviewCard.Portal>
  );
}
