"use client";

import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

const B = "[&>[data-slot=button]]";

export interface ButtonGroupProps extends ComponentProps<"div"> {
  /** "horizontal" (default) joins buttons side by side; "vertical" stacks them. */
  orientation?: "horizontal" | "vertical";
}

/**
 * Buttons fused into one control: borders are shared and only the outer corners stay round. The rounded
 * ends are the inline start of the first button and the inline end of the last, so RTL is correct without
 * any override. Children are `Button`s, `ButtonGroupSeparator`s or triggers rendered as a Button. Give the
 * group an `aria-label` when it is a set of related actions.
 */
export function ButtonGroup({ orientation = "horizontal", className, ...props }: ButtonGroupProps) {
  const horizontal = orientation === "horizontal";
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(
        "flex w-fit max-w-full",
        `${B}:relative ${B}:rounded-none ${B}:focus-visible:z-10 ${B}:hover:z-1`,
        horizontal
          ? [`${B}:first-child:rounded-s-control ${B}:last-child:rounded-e-control`, `${B}+${B}:-ms-px`]
          : ["flex-col", `${B}:first-child:rounded-t-control ${B}:last-child:rounded-b-control`, `${B}+${B}:-mt-px`],
        className,
      )}
      {...props}
    />
  );
}

/** A divider inside the group. Needed between buttons that have no border of their own (a primary split button). */
export function ButtonGroupSeparator({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="separator"
      data-slot="button-group-separator"
      className={cn(
        "w-px shrink-0 self-stretch bg-primary-foreground/30 in-data-[orientation=vertical]:h-px in-data-[orientation=vertical]:w-auto",
        className,
      )}
      {...props}
    />
  );
}
