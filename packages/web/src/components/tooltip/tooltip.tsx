"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { cn } from "../../lib/cn";

export const TooltipProvider = BaseTooltip.Provider;
export const TooltipRoot = BaseTooltip.Root;
export const TooltipTrigger = BaseTooltip.Trigger;

export interface TooltipContentProps extends ComponentProps<typeof BaseTooltip.Popup> {
  /** Prefer "inline-start" / "inline-end" over physical "left" / "right": the logical sides mirror in RTL. */
  side?: ComponentProps<typeof BaseTooltip.Positioner>["side"];
  align?: ComponentProps<typeof BaseTooltip.Positioner>["align"];
  sideOffset?: number;
}

export function TooltipContent({ className, side = "top", align, sideOffset = 6, ...props }: TooltipContentProps) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
        <BaseTooltip.Popup
          data-slot="tooltip-content"
          className={cn(
            // Inverted surface: ink on ivory grounds, ivory on navy.
            "max-w-64 rounded-control bg-foreground px-2 py-1 text-caption text-background",
            "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
            className as string,
          )}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export interface TooltipProps {
  /** Supplementary text only — never the sole carrier of meaning (tooltips are hidden on touch). */
  content: ReactNode;
  /** The trigger. Must be focusable; icon-only buttons still need their own aria-label. */
  children: ReactElement;
  /** Prefer "inline-start" / "inline-end" over physical "left" / "right": the logical sides mirror in RTL. */
  side?: TooltipContentProps["side"];
  align?: TooltipContentProps["align"];
  sideOffset?: number;
  /** Hover delay before opening, in ms (Base UI Trigger `delay`). */
  delay?: number;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: ComponentProps<typeof BaseTooltip.Root>["onOpenChange"];
}

/** Shorthand: <Tooltip content="Archive"><Button size="icon" aria-label="Archive">…</Button></Tooltip> */
export function Tooltip({ content, children, side, align, sideOffset, delay, open, onOpenChange }: TooltipProps) {
  return (
    <BaseTooltip.Root open={open} onOpenChange={onOpenChange}>
      <BaseTooltip.Trigger render={children} delay={delay} />
      <TooltipContent side={side} align={align} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </BaseTooltip.Root>
  );
}
