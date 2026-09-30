"use client";
import { cva } from "class-variance-authority";
import { CircleAlert, CircleCheck, CircleDot, CircleX, type LucideIcon, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { buttonVariants } from "../button";

export type AlertTone = "info" | "success" | "warning" | "danger";

/** Same shapes as Status and Attention, so the tone never depends on colour alone. */
const toneIcon: Record<AlertTone, LucideIcon> = { info: CircleDot, success: CircleCheck, warning: CircleAlert, danger: CircleX };

const alertVariants = cva("relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border p-3 text-start", {
  variants: {
    tone: {
      info: "border-nq-info/30 bg-nq-info-soft",
      success: "border-nq-success/30 bg-nq-success-soft",
      warning: "border-nq-warning/30 bg-nq-warning-soft",
      danger: "border-nq-danger/30 bg-nq-danger-soft",
    },
  },
  defaultVariants: { tone: "info" },
});

const iconText: Record<AlertTone, string> = {
  info: "text-nq-info-text",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
};

export interface AlertProps extends Omit<ComponentProps<"div">, "title"> {
  tone?: AlertTone;
  /** Short heading. Omit for a one-line notice. */
  title?: ReactNode;
  /** Replaces the tone glyph. */
  icon?: LucideIcon;
  /** One action at the inline end, usually a `<Button size="sm">` or a link. */
  action?: ReactNode;
  /** Shows a dismiss button; the host hides the alert. */
  onDismiss?: () => void;
  /** Label of the dismiss button. Default "Dismiss" / "تجاهل" by the Nasaq locale. */
  dismissLabel?: string;
}

/**
 * A quiet inline notice about the content around it: a saved-with-warnings summary, a failed sync, a
 * plan limit. The description is `children`. `warning` and `danger` default to `role="alert"`
 * (announced at once); `info` and `success` default to `role="status"` (announced politely).
 */
export function Alert({ tone = "info", title, icon, action, onDismiss, dismissLabel, role, className, children, ...props }: AlertProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const Glyph = icon ?? toneIcon[tone];
  return (
    <div
      data-slot="alert"
      data-tone={tone}
      role={role ?? (tone === "danger" || tone === "warning" ? "alert" : "status")}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <Glyph aria-hidden data-slot="alert-icon" className={cn("mt-0.5 size-4", iconText[tone])} />
      <div data-slot="alert-body" className="flex min-w-0 flex-col gap-0.5">
        {title ? (
          <div data-slot="alert-title" className="text-label text-foreground">
            {title}
          </div>
        ) : null}
        {children ? (
          <div data-slot="alert-description" className={cn("text-body-sm", title ? "text-muted-foreground" : "text-foreground")}>
            {children}
          </div>
        ) : null}
      </div>
      {action || onDismiss ? (
        <div data-slot="alert-actions" className="ms-3 flex items-center gap-1">
          {action}
          {onDismiss ? (
            <button
              type="button"
              aria-label={dismissLabel ?? (ar ? "تجاهل" : "Dismiss")}
              onClick={onDismiss}
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground [&_svg]:size-3.5")}
            >
              <X aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
