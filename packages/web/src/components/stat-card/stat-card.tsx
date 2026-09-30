import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Card } from "../card";
import { Sparkline } from "../chart";
import { type FormatNumberOptions, Num } from "../numeric";
import { Skeleton } from "../states";

export type StatTrend = "up" | "down" | "flat";
export type StatTone = "positive" | "negative" | "neutral";

const trendIcon: Record<StatTrend, LucideIcon> = { up: TrendingUp, down: TrendingDown, flat: Minus };

const toneText: Record<StatTone, string> = {
  positive: "text-nq-success-text",
  negative: "text-nq-danger-text",
  neutral: "text-muted-foreground",
};

const toneColor: Record<StatTone, string> = {
  positive: "var(--nq-success)",
  negative: "var(--nq-danger)",
  neutral: "var(--primary)",
};

export interface StatCardProps extends Omit<ComponentProps<typeof Card>, "children"> {
  /** What is measured. Localise it. */
  label: ReactNode;
  /** The figure. A number is formatted with `format` in the active locale; pass a node for anything else. */
  value: number | ReactNode;
  /** Intl options for a numeric `value`, e.g. `{ style: "currency", currency: "SAR", notation: "compact" }`. */
  format?: FormatNumberOptions;
  /** Change versus the previous period, as a fraction: 0.124 is +12.4%, -0.03 is -3%. Shown as a signed percentage. */
  delta?: number;
  /** Intl options for the delta. Default: percent with one decimal and an explicit sign. */
  deltaFormat?: FormatNumberOptions;
  /** Text after the delta, e.g. "vs last month". Localise it. */
  deltaLabel?: ReactNode;
  /** Cost-style metric: down is good, up is bad. Default false (up is good). */
  invert?: boolean;
  /** Values for a trailing trend line. Its colour follows the delta's tone. */
  sparkline?: readonly number[];
  /** Screen-reader summary of the sparkline. Without it the sparkline is decorative. */
  sparklineLabel?: string;
  /** Leading glyph in a soft tile, e.g. `<Wallet />`. */
  icon?: ReactNode;
  /** Show a skeleton with the same layout instead of the content. */
  loading?: boolean;
}

/**
 * KPI tile: label, a large tabular figure, the change since the last period with a good/bad tone, and an
 * optional trend line. The tone is colour plus the trend arrow and sign, so it does not rely on colour alone.
 */
export function StatCard({
  label,
  value,
  format,
  delta,
  deltaFormat,
  deltaLabel,
  invert = false,
  sparkline,
  sparklineLabel,
  icon,
  loading = false,
  className,
  ...props
}: StatCardProps) {
  const trend: StatTrend = delta === undefined || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const tone: StatTone = trend === "flat" ? "neutral" : (trend === "up") !== invert ? "positive" : "negative";
  const TrendIcon = trendIcon[trend];

  return (
    <Card
      data-slot="stat-card"
      data-trend={delta === undefined ? undefined : trend}
      data-tone={delta === undefined ? undefined : tone}
      aria-busy={loading || undefined}
      className={cn("gap-3 px-4 py-4", className)}
      {...props}
    >
      {loading ? (
        <div data-slot="stat-card-skeleton" className="flex flex-col gap-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {icon ? (
              <span data-slot="stat-card-icon" aria-hidden className="grid size-8 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground [&_svg]:size-4">
                {icon}
              </span>
            ) : null}
            <div data-slot="stat-card-label" className="min-w-0 truncate text-body-sm text-muted-foreground">
              {label}
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <div data-slot="stat-card-value" className="text-h2 leading-tight text-foreground tabular-nums">
                {typeof value === "number" ? <Num value={value} format={format} /> : value}
              </div>
              {delta !== undefined ? (
                <div data-slot="stat-card-delta" className="flex flex-wrap items-center gap-x-1.5 text-caption">
                  <span className={cn("inline-flex items-center gap-1 text-label", toneText[tone])}>
                    <TrendIcon aria-hidden className="size-3.5 shrink-0 rtl:-scale-x-100" />
                    <Num value={delta} format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero", ...deltaFormat }} />
                  </span>
                  {deltaLabel ? <span className="text-muted-foreground">{deltaLabel}</span> : null}
                </div>
              ) : null}
            </div>
            {sparkline?.length ? <Sparkline data={sparkline} color={toneColor[tone]} label={sparklineLabel} className="w-24" /> : null}
          </div>
        </>
      )}
    </Card>
  );
}

/** Responsive grid for StatCards: as many equal columns as fit, each at least 14rem wide. */
export function StatGrid({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="stat-grid" className={cn("grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3", className)} {...props} />;
}
