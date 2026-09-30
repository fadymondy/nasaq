"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { type FormatNumberOptions, Num } from "../numeric";
import { StatCard, StatGrid } from "../stat-card";
import { changeRatio, useAnalyticsLabels } from "./analytics-shared";

const STRINGS = {
  en: { vsPrevious: "vs previous period", was: "was", group: "Key metrics" },
  ar: { vsPrevious: "مقارنة بالفترة السابقة", was: "كانت", group: "المؤشرات الرئيسية" },
};

export type MetricTilesLabels = typeof STRINGS.en;

export interface MetricTileData {
  id: string;
  /** What is measured. Localise it. */
  label: ReactNode;
  /** The figure for the current period. */
  value: number;
  /** The same figure for the comparison period. Gives the delta and the "was" value. */
  previous?: number;
  /** Intl options for `value` and `previous`. */
  format?: FormatNumberOptions;
  /** Replaces the formatted value, for figures Intl cannot format such as a duration ("2m 14s"). */
  display?: ReactNode;
  /** Replaces the formatted previous value the same way. */
  previousDisplay?: ReactNode;
  /** Lower is better (bounce rate, load time, position, errors). */
  invert?: boolean;
  /** Values for the trend line. */
  sparkline?: readonly number[];
  sparklineLabel?: string;
  icon?: ReactNode;
}

export interface MetricTilesProps {
  metrics: readonly MetricTileData[];
  /** Id of the metric that is selected. With `onSelect`, tiles become toggle buttons that drive a chart. */
  selected?: string;
  onSelect?: (id: string) => void;
  /** Text after each delta. Default "vs previous period". */
  comparisonLabel?: ReactNode;
  loading?: boolean;
  /** How many skeleton tiles to show while `loading` and `metrics` is empty. Default 4. */
  skeletons?: number;
  className?: string;
  labels?: Partial<MetricTilesLabels>;
}

/**
 * Row of KPI tiles that each compare against the previous period: the figure, a signed percentage with an arrow and tone,
 * the previous figure, and an optional trend line. Built on StatCard; selectable tiles drive a TimeSeriesPanel.
 */
export function MetricTiles({ metrics, selected, onSelect, comparisonLabel, loading = false, skeletons = 4, className, labels }: MetricTilesProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  if (loading && metrics.length === 0) {
    return (
      <StatGrid data-slot="metric-tiles" className={className} aria-busy>
        {Array.from({ length: skeletons }, (_, i) => (
          <StatCard key={i} label="" value={0} loading />
        ))}
      </StatGrid>
    );
  }
  return (
    <StatGrid data-slot="metric-tiles" role="group" aria-label={t.group} className={className}>
      {metrics.map((m) => {
        const delta = changeRatio(m.value, m.previous);
        const card = (
          <StatCard
            key={onSelect ? undefined : m.id}
            icon={m.icon}
            label={m.label}
            value={m.display ?? m.value}
            format={m.format}
            delta={delta}
            invert={m.invert}
            loading={loading}
            deltaLabel={
              m.previous === undefined ? undefined : (
                <>
                  {comparisonLabel ?? t.vsPrevious}
                  {" · "}
                  {t.was} {m.previousDisplay ?? <Num value={m.previous} format={m.format} />}
                </>
              )
            }
            sparkline={m.sparkline}
            sparklineLabel={m.sparklineLabel}
            className={cn(onSelect && "h-full", onSelect && selected === m.id && "border-primary ring-1 ring-primary")}
            data-metric={m.id}
          />
        );
        if (!onSelect) return card;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={selected === m.id}
            onClick={() => onSelect(m.id)}
            className="rounded-card text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          >
            {card}
          </button>
        );
      })}
    </StatGrid>
  );
}
