import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, CSSProperties } from "react";
import { cn } from "../../lib/cn";

export const TAG_HUES = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"] as const;
export type TagHue = (typeof TAG_HUES)[number];

export const badgeVariants = cva(
  "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-border bg-secondary text-foreground",
        outline: "border-border text-muted-foreground",
        /** Product identity (the tenant's brand colour), e.g. "Pro" or the product mark. Not a status. */
        brand: "border-nq-brand/40 bg-[color-mix(in_oklab,var(--nq-brand)_14%,transparent)] text-foreground",
        /** Nasaq gold: featured / new. Not a status. */
        accent: "border-nq-accent/40 bg-nq-accent/15 text-nq-accent-text",
        // Statuses: fixed hues shared by every brand. Pair with a label (and ideally an icon) — never hue alone.
        success: "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
        warning: "border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text",
        danger: "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text",
        info: "border-nq-info/40 bg-nq-info-soft text-nq-info-text",
        tag: "border-transparent bg-[var(--tag-soft)] text-[var(--tag-solid)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  /** Categorical hue for user labels (variant="tag"). Status must never rely on hue alone. */
  hue?: TagHue;
}

export function Badge({ className, variant, hue = "gray", style, ...props }: BadgeProps) {
  const tagStyle =
    variant === "tag" ? { "--tag-solid": `var(--nq-tag-${hue})`, "--tag-soft": `var(--nq-tag-${hue}-soft)` } : undefined;
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      style={{ ...tagStyle, ...style } as CSSProperties}
      {...props}
    />
  );
}
