"use client";

import type { ReactNode } from "react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { BreakdownTable, type BreakdownTableLabels } from "../breakdown-table";
import { countryName, flagEmoji, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import type { FormatNumberOptions } from "../numeric";

const STRINGS = {
  en: { country: "Country", unknown: "Unknown", title: "Countries" },
  ar: { country: "الدولة", unknown: "غير معروفة", title: "الدول" },
};

export type GeoListLabels = typeof STRINGS.en;

export interface GeoRow {
  /** ISO 3166-1 alpha-2 code: "SA", "EG". Anything else shows as Unknown. The name is localised for you. */
  code: string;
  value: number;
  previous?: number;
}

export interface GeoListProps {
  rows: readonly GeoRow[];
  /** Heading of the value column: "Users", "Clicks". */
  valueLabel: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  format?: FormatNumberOptions;
  /** Rows shown before "Show all". Default 8. */
  limit?: number;
  invert?: boolean;
  color?: string;
  loading?: boolean;
  className?: string;
  labels?: Partial<GeoListLabels> & { table?: Partial<BreakdownTableLabels> };
}

/**
 * Visitors or clicks by country: a flag, the country name in the reader's language, a bar, the figure, its share and the
 * change. Flags are emoji text; names come from `Intl.DisplayNames`. Built on BreakdownTable.
 */
export function GeoList({ rows, valueLabel, title, description, format, limit = 8, invert, color, loading, className, labels }: GeoListProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const locale = useOptionalNasaq()?.locale ?? "en";
  return (
    <BreakdownTable
      className={className}
      title={title ?? t.title}
      description={description}
      dimensionLabel={t.country}
      valueLabel={valueLabel}
      format={format}
      limit={limit}
      invert={invert}
      color={color}
      loading={loading}
      labels={labels?.table}
      rows={rows.map((r) => {
        const flag = flagEmoji(r.code);
        const name = flag ? countryName(r.code, locale) : t.unknown;
        return {
          id: r.code,
          value: r.value,
          previous: r.previous,
          label: (
            <span className="inline-flex items-center gap-2">
              {flag ? (
                <span aria-hidden className="text-base leading-none">
                  {flag}
                </span>
              ) : null}
              {name}
            </span>
          ),
        };
      })}
    />
  );
}
