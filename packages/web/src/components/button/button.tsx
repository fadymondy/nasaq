"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "../spinner";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent",
    "font-sans text-label transition-colors duration-150 ease-nq",
    "min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
    "disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** The one primary action on a view. */
        primary: "bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--nq-action)_88%,var(--nq-fg))]",
        secondary: "border-border bg-card text-foreground hover:bg-nq-hover",
        ghost: "text-foreground hover:bg-nq-hover",
        danger: "bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklab,var(--nq-danger-solid)_88%,var(--nq-fg))]",
        link: "text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current",
      },
      size: {
        sm: "h-control-sm px-2.5",
        md: "h-control px-[var(--nq-control-pad)]",
        lg: "h-[calc(var(--nq-control)+8px)] px-5 text-body",
        icon: "size-control p-0",
        "icon-sm": "size-control-sm p-0",
      },
    },
    compoundVariants: [
      // Text-sized links collapse to their line box; className or an icon size can still override.
      { variant: "link", size: ["sm", "md", "lg"], className: "h-auto px-0" },
    ],
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends ComponentProps<typeof BaseButton>, VariantProps<typeof buttonVariants> {
  /** Shows a spinner, sets aria-busy and blocks interaction while keeping focus. */
  loading?: boolean;
}

export function Button({ className, variant, size, loading = false, disabled, children, ...props }: ButtonProps) {
  const iconOnly = size === "icon" || size === "icon-sm";
  return (
    <BaseButton
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className as string)}
      {...props}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      focusableWhenDisabled={loading || props.focusableWhenDisabled}
    >
      {loading ? <Spinner /> : null}
      {loading && iconOnly ? null : children}
    </BaseButton>
  );
}
