"use client";

import { Meter as BaseMeter } from "@base-ui/react/meter";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cva } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export type ProgressTone = "default" | "info" | "success" | "warning" | "danger";
export type ProgressSize = "sm" | "md";

const fillTone: Record<ProgressTone, string> = {
  default: "bg-primary",
  info: "bg-nq-info",
  success: "bg-nq-success",
  warning: "bg-nq-warning",
  danger: "bg-nq-danger",
};

const trackVariants = cva("relative block w-full overflow-hidden rounded-full bg-nq-surface-soft", {
  variants: { size: { sm: "h-1", md: "h-2" } },
  defaultVariants: { size: "md" },
});

/** The fill starts at the inline start (Base UI sets `inset-inline-start`), so RTL fills right to left. */
const fillClass = "block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none";

interface GaugeBaseProps extends Omit<ComponentProps<"div">, "children"> {
  /** Visible name shown above the bar. Without it, pass `aria-label`. */
  label?: ReactNode;
  /** Show the formatted value at the inline end of the label row. Default true when `label` is set. */
  showValue?: boolean;
  /** Replaces the formatted value text, e.g. "45 of 50 seats". Spoken value stays the number. */
  valueText?: ReactNode;
  /** `Intl.NumberFormat` options for the value. Default: the value as a percentage of the range. */
  format?: Intl.NumberFormatOptions;
  /** Locale for number formatting. Defaults to the runtime locale. */
  locale?: Intl.LocalesArgument;
  size?: ProgressSize;
  min?: number;
  max?: number;
}

export interface ProgressProps extends GaugeBaseProps {
  /** Current value. `null` is indeterminate: work is running and its length is unknown. */
  value: number | null;
  tone?: ProgressTone;
}

function toFraction(value: number, min: number, max: number) {
  return max === min ? 0 : (value - min) / (max - min);
}

/**
 * A bar for work in progress: an upload, an import, a setup. `value={null}` shows an indeterminate
 * pulse. For a quantity measured against a limit (seats, storage, budget), use `Meter`.
 */
export function Progress({
  value,
  tone = "default",
  label,
  showValue,
  valueText,
  format,
  locale,
  size,
  min = 0,
  max = 100,
  className,
  ...props
}: ProgressProps) {
  const indeterminate = value === null;
  return (
    <BaseProgress.Root
      data-slot="progress"
      data-tone={tone}
      value={value}
      min={min}
      max={max}
      format={format}
      locale={locale}
      className={cn("flex w-full flex-col gap-1.5", className as string)}
      {...props}
    >
      <Head label={label} showValue={showValue ?? label !== undefined} valueText={valueText} indeterminate={indeterminate} Label={BaseProgress.Label} Value={BaseProgress.Value} />
      <BaseProgress.Track data-slot="progress-track" className={trackVariants({ size })}>
        <BaseProgress.Indicator
          data-slot="progress-indicator"
          className={cn(fillClass, fillTone[tone], indeterminate && "w-full motion-safe:animate-pulse")}
        />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}

function Head({
  label,
  showValue,
  valueText,
  indeterminate,
  Label,
  Value,
}: {
  label?: ReactNode;
  showValue: boolean;
  valueText?: ReactNode;
  indeterminate: boolean;
  Label: typeof BaseProgress.Label | typeof BaseMeter.Label;
  Value: typeof BaseProgress.Value | typeof BaseMeter.Value;
}) {
  if (label === undefined && !showValue) return null;
  const L = Label as typeof BaseProgress.Label;
  const V = Value as typeof BaseProgress.Value;
  return (
    <div data-slot="progress-head" className="flex items-baseline justify-between gap-3 text-body-sm">
      {label !== undefined ? <L className="text-label text-foreground">{label}</L> : <span />}
      {showValue && !indeterminate ? (
        <V className="text-muted-foreground tabular-nums">{valueText !== undefined ? () => valueText : undefined}</V>
      ) : null}
    </div>
  );
}

export interface MeterProps extends GaugeBaseProps {
  /** Current amount within `min`..`max`. */
  value: number;
  /** Fraction of the range (0 to 1) at which the fill turns warning. Default 0.8. */
  warnAt?: number;
  /** Fraction of the range (0 to 1) at which the fill turns danger. Default 0.95. */
  dangerAt?: number;
  /** Forces a tone instead of deriving it from the thresholds. */
  tone?: ProgressTone;
}

/**
 * A quantity against a limit: seats used, storage, monthly budget. It is not a task; it never
 * animates and never indeterminate. The fill turns warning past `warnAt` and danger past `dangerAt`.
 */
export function Meter({ value, warnAt = 0.8, dangerAt = 0.95, tone, label, showValue, valueText, format, locale, size, min = 0, max = 100, className, ...props }: MeterProps) {
  const fraction = toFraction(value, min, max);
  const derived: ProgressTone = tone ?? (fraction >= dangerAt ? "danger" : fraction >= warnAt ? "warning" : "default");
  return (
    <BaseMeter.Root
      data-slot="meter"
      data-tone={derived}
      value={value}
      min={min}
      max={max}
      format={format}
      locale={locale}
      className={cn("flex w-full flex-col gap-1.5", className as string)}
      {...props}
    >
      <Head label={label} showValue={showValue ?? label !== undefined} valueText={valueText} indeterminate={false} Label={BaseMeter.Label} Value={BaseMeter.Value} />
      <BaseMeter.Track data-slot="meter-track" className={trackVariants({ size })}>
        <BaseMeter.Indicator data-slot="meter-indicator" className={cn(fillClass, fillTone[derived])} />
      </BaseMeter.Track>
    </BaseMeter.Root>
  );
}
