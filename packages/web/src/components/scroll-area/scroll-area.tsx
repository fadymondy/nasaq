"use client";

import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export interface ScrollAreaProps extends ComponentProps<typeof BaseScrollArea.Root> {
  /** Which axes scroll and show a scrollbar. Default "vertical". */
  orientation?: "vertical" | "horizontal" | "both";
  /** Classes for the scrolling viewport, for padding inside the scroll region. */
  viewportClassName?: string;
  /** Accessible name for the scroll region. The viewport is keyboard-focusable, so it needs a name. */
  "aria-label"?: string;
}

/**
 * A scroll container with a thin styled scrollbar that appears on hover and while scrolling. Give it a bounded
 * height (or width) through `className`. The vertical scrollbar sits on the inline-end edge, so it moves to the
 * left in RTL. The viewport is focusable, so keyboard users can scroll with the arrow keys.
 */
export function ScrollArea({
  orientation = "vertical",
  className,
  viewportClassName,
  children,
  "aria-label": ariaLabel,
  ...props
}: ScrollAreaProps) {
  return (
    <BaseScrollArea.Root data-slot="scroll-area" className={cn("relative min-h-0 min-w-0 overflow-hidden", className as string)} {...props}>
      <BaseScrollArea.Viewport
        data-slot="scroll-area-viewport"
        role="region"
        aria-label={ariaLabel}
        className={cn(
          "size-full rounded-[inherit] outline-none",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
          viewportClassName,
        )}
      >
        {children}
      </BaseScrollArea.Viewport>
      {orientation !== "horizontal" ? <ScrollBar orientation="vertical" /> : null}
      {orientation !== "vertical" ? <ScrollBar orientation="horizontal" /> : null}
      {orientation === "both" ? <BaseScrollArea.Corner data-slot="scroll-area-corner" /> : null}
    </BaseScrollArea.Root>
  );
}

/** One scrollbar with its thumb. `ScrollArea` renders these for you; use it directly only when composing your own Base UI ScrollArea. */
export function ScrollBar({ orientation = "vertical", className, ...props }: ComponentProps<typeof BaseScrollArea.Scrollbar>) {
  return (
    <BaseScrollArea.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "absolute flex touch-none select-none p-0.5 opacity-0 transition-opacity duration-150 ease-nq",
        "data-hovering:opacity-100 data-scrolling:opacity-100",
        // The vertical bar sits on the inline-end edge: the right in LTR, the left in RTL.
        orientation === "vertical" ? "inset-y-0 end-0 w-2.5" : "inset-x-0 bottom-0 h-2.5 flex-col",
        className as string,
      )}
      {...props}
    >
      <BaseScrollArea.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-nq-line-strong" />
    </BaseScrollArea.Scrollbar>
  );
}
