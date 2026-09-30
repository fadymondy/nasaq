"use client";

import { type ComponentProps, type CSSProperties, type ReactElement, type ReactNode, useId } from "react";
import { Area, AreaChart, Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, type YAxisProps } from "recharts";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { type FormatNumberOptions, useFormatNumber } from "../numeric";

/** Series colours, in order. Brand first, then the tag hues; all are theme tokens (light, dark and brand aware). */
export const CHART_COLORS = [
  "var(--primary)",
  "var(--nq-tag-blue)",
  "var(--nq-tag-teal)",
  "var(--nq-tag-amber)",
  "var(--nq-tag-violet)",
  "var(--nq-tag-pink)",
  "var(--nq-tag-orange)",
  "var(--nq-tag-green)",
] as const;

export interface ChartSeries {
  /** Human label shown in the tooltip and legend. Localise it. */
  label?: ReactNode;
  /** Any CSS colour value, normally a token: "var(--nq-tag-teal)". Default: the palette entry for the series' position. */
  color?: string;
}

/** Series key -> label and colour. The key is what you pass as `dataKey` (or a slice's `nameKey` value). */
export type ChartConfig = Record<string, ChartSeries>;

function useIsRtl() {
  return useOptionalNasaq()?.isRtl ?? false;
}

/**
 * Axis props that mirror a chart for RTL: the X axis runs right to left and the Y axis sits on the right.
 * Spread them on your axes: `<XAxis dataKey="month" {...xAxis} />` and `<YAxis {...yAxis} />`.
 */
export function useChartAxis(): { isRtl: boolean; xAxis: { reversed: boolean }; yAxis: Pick<YAxisProps, "orientation"> } {
  const isRtl = useIsRtl();
  return { isRtl, xAxis: { reversed: isRtl }, yAxis: { orientation: isRtl ? "right" : "left" } };
}

/** Resolve every series colour so charts can use `var(--color-<key>)` for fills and strokes. */
function seriesVars(config: ChartConfig): CSSProperties {
  const vars: Record<string, string> = {};
  Object.keys(config).forEach((key, i) => {
    vars[`--color-${key}`] = config[key]?.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
  });
  return vars as CSSProperties;
}

export interface ChartContainerProps extends Omit<ComponentProps<"div">, "children"> {
  config: ChartConfig;
  /** One Recharts chart (`AreaChart`, `BarChart`, `LineChart`, `PieChart`, ...). */
  children: ReactElement;
  /** Accessible name for the chart; a chart is an image to a screen reader, so summarise it. */
  label?: string;
}

/**
 * Sizes a Recharts chart to its box (default 16:9; pass `className="h-64"` or `aspect-*` to change it),
 * defines `--color-<key>` for every series in `config`, and themes Recharts' axes, grid and cursor with tokens.
 */
export function ChartContainer({ config, children, label, className, style, ...props }: ChartContainerProps) {
  return (
    <div
      data-slot="chart"
      role={label ? "img" : undefined}
      aria-label={label}
      style={{ ...seriesVars(config), ...style }}
      className={cn(
        "flex aspect-video w-full justify-center text-caption",
        "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
        "[&_.recharts-cartesian-grid_line]:stroke-border",
        "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
        "[&_.recharts-dot]:stroke-card [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden",
        "[&_.recharts-sector]:stroke-card [&_.recharts-surface]:outline-hidden",
        className,
      )}
      {...props}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 180 }}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

interface PayloadItem {
  name?: string | number;
  dataKey?: unknown;
  value?: unknown;
  color?: string;
  fill?: string;
  payload?: { fill?: string } & Record<string, unknown>;
}

interface TooltipContentInjected {
  active?: boolean;
  payload?: readonly PayloadItem[];
  label?: string | number;
}

export interface ChartTooltipContentProps extends TooltipContentInjected {
  config?: ChartConfig;
  /** Intl options for the values, e.g. `{ style: "currency", currency: "SAR" }`. Formatted in the active locale. */
  valueFormat?: FormatNumberOptions;
  /** Format the heading (the category / X value). */
  labelFormatter?: (label: string | number | undefined) => ReactNode;
  /** Hide the heading. */
  hideLabel?: boolean;
  className?: string;
}

/**
 * Tooltip card: heading, then one row per series with a colour key, its label and a tabular figure.
 * Use as `<ChartTooltip content={<ChartTooltipContent config={config} />} />`.
 */
export function ChartTooltipContent({ active, payload, label, config = {}, valueFormat, labelFormatter, hideLabel, className }: ChartTooltipContentProps) {
  const fmt = useFormatNumber();
  const isRtl = useIsRtl();
  if (!active || !payload?.length) return null;
  const heading = labelFormatter ? labelFormatter(label) : (config[String(label)]?.label ?? label);
  return (
    <div
      data-slot="chart-tooltip"
      dir={isRtl ? "rtl" : "ltr"}
      className={cn("grid min-w-32 gap-1.5 rounded-control border border-border bg-popover px-2.5 py-1.5 text-caption text-popover-foreground shadow-md", className)}
    >
      {!hideLabel && heading !== undefined && heading !== "" ? <div className="text-label">{heading}</div> : null}
      <div className="grid gap-1">
        {payload.map((item, i) => {
          const key = String(typeof item.dataKey === "string" || typeof item.dataKey === "number" ? item.dataKey : (item.name ?? ""));
          const series = config[key] ?? (item.name !== undefined ? config[String(item.name)] : undefined);
          const color = item.payload?.fill ?? item.color ?? item.fill ?? `var(--color-${key})`;
          const raw = Array.isArray(item.value) ? item.value[item.value.length - 1] : item.value;
          const value = Number(raw);
          return (
            <div key={`${key}-${i}`} className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
              <span className="text-muted-foreground">{series?.label ?? item.name}</span>
              <span className="ms-auto ps-3 text-label tabular-nums">{Number.isFinite(value) ? fmt(value, valueFormat) : String(raw ?? "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Recharts `Tooltip` with Nasaq styling. Pass `content={<ChartTooltipContent config={config} />}` to use your labels and number format. */
export function ChartTooltip(props: ComponentProps<typeof Tooltip>) {
  return <Tooltip cursor content={<ChartTooltipContent />} {...props} />;
}

interface LegendItem {
  value?: string | number;
  dataKey?: unknown;
  color?: string;
  payload?: { fill?: string } & Record<string, unknown>;
}

export interface ChartLegendContentProps {
  config?: ChartConfig;
  /** Injected by Recharts. */
  payload?: readonly LegendItem[];
  className?: string;
}

/** Legend row: a colour key and the series label from `config`. */
export function ChartLegendContent({ config = {}, payload, className }: ChartLegendContentProps) {
  if (!payload?.length) return null;
  return (
    <ul data-slot="chart-legend" className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-caption", className)}>
      {payload.map((item, i) => {
        const key = String(typeof item.dataKey === "string" || typeof item.dataKey === "number" ? item.dataKey : (item.value ?? ""));
        const series = config[key] ?? config[String(item.value)];
        return (
          <li key={`${key}-${i}`} className="flex items-center gap-1.5 text-muted-foreground">
            <span aria-hidden className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.payload?.fill ?? item.color }} />
            {series?.label ?? item.value}
          </li>
        );
      })}
    </ul>
  );
}

/** Recharts `Legend` with Nasaq styling. Pass `content={<ChartLegendContent config={config} />}` to use your labels. */
export function ChartLegend(props: ComponentProps<typeof Legend>) {
  return <Legend verticalAlign="bottom" content={<ChartLegendContent />} {...props} />;
}

type Point = number | { value: number };
const toRows = (data: readonly Point[]) => data.map((d, i) => ({ i, value: typeof d === "number" ? d : d.value }));

interface TinyChartProps extends Omit<ComponentProps<"div">, "children"> {
  /** Values in order. Either numbers or `{ value }` objects. */
  data: readonly Point[];
  /** Any CSS colour, normally a token. Default: the brand colour. */
  color?: string;
  /** Screen-reader summary, e.g. "Revenue, last 12 weeks, up 12%". Without it the chart is hidden from assistive tech. */
  label?: string;
}

export interface SparklineProps extends TinyChartProps {
  /** Fill the area under the line. Default true. */
  fill?: boolean;
}

/**
 * Axis-less trend line for table cells and cards. Sized by its box (default 8rem x 2rem); time runs right to
 * left in RTL. No tooltip: put the figure next to it.
 */
export function Sparkline({ data, color = "var(--primary)", label, fill = true, className, ...props }: SparklineProps) {
  const id = useId();
  const isRtl = useIsRtl();
  const rows = toRows(data);
  return (
    <div
      data-slot="sparkline"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("h-8 w-32 shrink-0", className)}
      {...props}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 128, height: 32 }}>
        <AreaChart data={rows} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide reversed={isRtl} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={fill ? `url(#${id})` : "none"} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface MiniBarProps extends TinyChartProps {
  /** Index of a bar to emphasise (the others are dimmed), e.g. the current period. */
  highlight?: number;
}

/** Axis-less bar strip for table cells and cards. Same sizing and RTL rules as `Sparkline`. */
export function MiniBar({ data, color = "var(--primary)", label, highlight, className, ...props }: MiniBarProps) {
  const isRtl = useIsRtl();
  const rows = toRows(data);
  return (
    <div
      data-slot="mini-bar"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("h-8 w-32 shrink-0", className)}
      {...props}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 128, height: 32 }}>
        <BarChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap={2}>
          <XAxis dataKey="i" hide reversed={isRtl} />
          <Bar
            dataKey="value"
            fill={color}
            isAnimationActive={false}
            shape={(p: { x?: number; y?: number; width?: number; height?: number; index?: number }) => {
              const { x = 0, y = 0, width = 0, height = 0, index = 0 } = p;
              return <rect x={x} y={y} width={width} height={Math.max(height, 0)} rx={2} fill={color} opacity={highlight === undefined || highlight === index ? 1 : 0.35} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
