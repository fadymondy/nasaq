import { Circle, CircleAlert, CircleCheck, CircleDot, CircleX, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

/** Each tone has its own shape, so status reads without colour (colour-blind users, brand-hue collisions). */
const toneIcon: Record<StatusTone, LucideIcon> = {
  neutral: Circle,
  info: CircleDot,
  success: CircleCheck,
  warning: CircleAlert,
  danger: CircleX,
};

const toneText: Record<StatusTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-nq-info-text",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
};

export interface StatusProps extends ComponentProps<"span"> {
  /** Generic meaning, shared by every product. Products map their own states onto these five. */
  tone?: StatusTone;
  /** Product-specific glyph (e.g. a half-filled circle for "In progress"). Keep it distinct per state. */
  icon?: LucideIcon;
  /** Tint the label as well as the icon. Default false: the label stays body text, the icon carries tone. */
  tinted?: boolean;
}

/**
 * Inline status: icon + label, no container. Use it in tables, lists and headers where a pill badge
 * would be too heavy; use `<Badge variant="success">` where the status needs its own chip.
 */
export function Status({ tone = "neutral", icon, tinted = false, className, children, ...props }: StatusProps) {
  const Icon = icon ?? toneIcon[tone];
  return (
    <span
      data-slot="status"
      data-tone={tone}
      className={cn("inline-flex min-w-0 items-center gap-1.5 text-body-sm", tinted ? toneText[tone] : "text-foreground", className)}
      {...props}
    >
      <Icon aria-hidden className={cn("size-3.5 shrink-0", toneText[tone])} />
      <span className="truncate" title={typeof children === "string" ? children : undefined}>
        {children}
      </span>
    </span>
  );
}
