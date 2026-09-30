"use client";

import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/**
 * The bordered shell. It owns the border, height, focus ring and invalid state so addons and the input
 * read as one control. Put `InputGroupAddon`s before/after the `InputGroupInput`; DOM order is visual order
 * and mirrors in RTL.
 */
export function InputGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="input-group"
      className={cn(
        "group/input-group flex h-control min-h-[var(--nq-touch-min,0px)] w-full min-w-0 items-center overflow-hidden rounded-control border border-input bg-card text-body text-foreground",
        "transition-colors duration-150 ease-nq",
        "focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus",
        "has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger",
        "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export interface InputGroupAddonProps extends ComponentProps<"div"> {
  /** Which edge the addon sits on. Logical: `end` is the left edge in RTL. Default `start`. */
  align?: "start" | "end";
}

/** An icon, a text affix (`https://`, `SAR`) or a button. */
export function InputGroupAddon({ className, align = "start", ...props }: InputGroupAddonProps) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "flex h-full shrink-0 items-center gap-1.5 text-body-sm text-muted-foreground [&_svg]:size-4",
        align === "start" ? "order-first ps-3 pe-1" : "order-last ps-1 pe-3",
        className,
      )}
      {...props}
    />
  );
}

/** Text affix for units and protocols. */
export function InputGroupText({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="input-group-text" className={cn("select-none whitespace-nowrap", className)} {...props} />;
}

/** The borderless input. Still a Base UI Input, so Field label, description and error keep working. */
export function InputGroupInput({ className, ltr, ...props }: ComponentProps<typeof BaseInput> & { ltr?: boolean }) {
  return (
    <BaseInput
      data-slot="input-group-input"
      {...(ltr ? { dir: "ltr" as const } : {})}
      className={cn(
        "h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-body text-foreground outline-none",
        "placeholder:text-muted-foreground disabled:cursor-not-allowed",
        "pointer-coarse:text-[16px]",
        ltr && "text-start",
        className as string,
      )}
      {...props}
    />
  );
}
