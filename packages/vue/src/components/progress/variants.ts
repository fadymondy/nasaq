import { cva } from "class-variance-authority";

export type ProgressTone = "default" | "info" | "success" | "warning" | "danger";
export type ProgressSize = "sm" | "md";

export const fillTone: Record<ProgressTone, string> = {
  default: "bg-primary",
  info: "bg-nq-info",
  success: "bg-nq-success",
  warning: "bg-nq-warning",
  danger: "bg-nq-danger",
};

export const trackVariants = cva("relative block w-full overflow-hidden rounded-full bg-nq-surface-soft", {
  variants: { size: { sm: "h-1", md: "h-2" } },
  defaultVariants: { size: "md" },
});

/** The fill starts at the inline start (inset-inline-start), so RTL fills right to left. */
export const fillClass = "block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none";

export const rootClass = "flex w-full flex-col gap-1.5";
export const headClass = "flex items-baseline justify-between gap-3 text-body-sm";
export const labelClass = "text-label text-foreground";
export const valueClass = "text-muted-foreground tabular-nums";

/** Formats like Base UI: the value as a percentage of 0..100 unless `format` says otherwise. Latin digits. */
export function formatGauge(value: number, locale: string, format?: Intl.NumberFormatOptions): string {
  const l = `${locale}-u-nu-latn`;
  return format ? new Intl.NumberFormat(l, format).format(value) : new Intl.NumberFormat(l, { style: "percent" }).format(value / 100);
}

export function toFraction(value: number, min: number, max: number) {
  return max === min ? 0 : (value - min) / (max - min);
}
