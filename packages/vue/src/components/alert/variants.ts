import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, CircleDot, CircleX } from "lucide-vue-next";
import type { Component } from "vue";

export type AlertTone = "info" | "success" | "warning" | "danger";

/** Same shapes as Status and Attention, so the tone never depends on colour alone. */
export const alertToneIcon: Record<AlertTone, Component> = { info: CircleDot, success: CircleCheck, warning: CircleAlert, danger: CircleX };

// Same classes as the React Alert (packages/web/src/components/alert/alert.tsx).
export const alertVariants = cva("relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border p-3 text-start", {
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

export const alertIconText: Record<AlertTone, string> = {
  info: "text-nq-info-text",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
};

export type AlertVariants = VariantProps<typeof alertVariants>;
