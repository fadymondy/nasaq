import { cva, type VariantProps } from "class-variance-authority";

// Same classes as the React Button (packages/web/src/components/button/button.tsx).
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
    compoundVariants: [{ variant: "link", size: ["sm", "md", "lg"], className: "h-auto px-0" }],
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
