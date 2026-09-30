"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { changeRatio, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type FormatNumberOptions, Num } from "../numeric";
import { Skeleton } from "../states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";

const STRINGS = {
  en: { share: "Share", change: "Change", showAll: (n: number) => `Show all ${n}`, showLess: "Show fewer", empty: "No data for this period", top: (n: number) => `Top ${n}` },
  ar: { share: "النسبة", change: "التغيّر", showAll: (n: number) => `عرض الكل (${n})`, showLess: "عرض أقل", empty: "لا بيانات لهذه الفترة", top: (n: number) => `أعلى ${n}` },
};

export type BreakdownTableLabels = typeof STRINGS.en;

export interface BreakdownRow {
  id: string;
  /** What the row is: a channel, a page path, a device. Localise it, or pass a node with a flag or icon. */
  label: ReactNode;
  /** The measure for the current period. */
  value: number;
  /** The same measure for the previous period. Adds the change column. */
  previous?: number;
  /** Where the row goes, for example a page report. */
  href?: string;
}

export interface BreakdownColumn {
  id: string;
  header: ReactNode;
  cell: (row: BreakdownRow) => ReactNode;
  align?: "start" | "end";
}

export interface BreakdownTableProps {
  rows: readonly BreakdownRow[];
  title?: ReactNode;
  description?: ReactNode;
  /** Heading of the first column: "Channel", "Page". */
  dimensionLabel: ReactNode;
  /** Heading of the value column: "Sessions", "Clicks". */
  valueLabel: ReactNode;
  format?: FormatNumberOptions;
  /** Rows shown before "Show all". Default 8. */
  limit?: number;
  /** Show each row's share of the total. Default true. */
  showShare?: boolean;
  /** Lower is better (load time, errors), so a rise is the bad tone. */
  invert?: boolean;
  /** Bar colour, normally a token. Default the brand colour. */
  color?: string;
  /** Row labels are code, paths or URLs: keep them left-to-right inside RTL. */
  ltrLabels?: boolean;
  /** Extra columns after the value. */
  columns?: readonly BreakdownColumn[];
  /** Accessible name of the table. Default: the title when it is a string. */
  label?: string;
  action?: ReactNode;
  loading?: boolean;
  className?: string;
  labels?: Partial<BreakdownTableLabels>;
}

/**
 * A top-N table where each row carries a bar sized against the largest value: the label, the measure, its share of the total
 * and its change against the previous period. Used for channels, sources, pages, devices and countries.
 */
export function BreakdownTable({
  rows,
  title,
  description,
  dimensionLabel,
  valueLabel,
  format,
  limit = 8,
  showShare = true,
  invert = false,
  color = "var(--primary)",
  ltrLabels = false,
  columns,
  label,
  action,
  loading = false,
  className,
  labels,
}: BreakdownTableProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [all, setAll] = useState(false);
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, r) => sum + r.value, 0);
  const max = sorted[0]?.value ?? 0;
  const shown = all ? sorted : sorted.slice(0, limit);
  const hasPrevious = rows.some((r) => r.previous !== undefined);

  return (
    <Card data-slot="breakdown-table" aria-busy={loading || undefined} className={className}>
      {title || description || action ? (
        <CardHeader>
          {title ? <CardTitle as="h3">{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      ) : null}
      <CardContent className="px-0">
        {loading ? (
          <div className="flex flex-col gap-3 px-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <Table label={label ?? (typeof title === "string" ? title : undefined)}>
            <TableHeader>
              <TableRow>
                <TableHead>{dimensionLabel}</TableHead>
                <TableHead className="text-end">{valueLabel}</TableHead>
                {showShare ? <TableHead className="hidden text-end sm:table-cell">{t.share}</TableHead> : null}
                {hasPrevious ? <TableHead className="text-end">{t.change}</TableHead> : null}
                {columns?.map((c) => (
                  <TableHead key={c.id} className={c.align === "end" ? "text-end" : undefined}>
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((row) => {
                const delta = changeRatio(row.value, row.previous);
                const good = delta === undefined || delta === 0 ? undefined : delta > 0 !== invert;
                const width = max > 0 ? Math.max(2, (row.value / max) * 100) : 0;
                const labelNode = ltrLabels ? (
                  <bdi dir="ltr" className="block truncate">
                    {row.label}
                  </bdi>
                ) : (
                  <span className="block truncate" dir="auto">
                    {row.label}
                  </span>
                );
                return (
                  <TableRow key={row.id} data-row={row.id}>
                    <TableCell className="min-w-40 max-w-0 sm:min-w-56">
                      {row.href ? (
                        <a href={row.href} className="block truncate text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus">
                          {labelNode}
                        </a>
                      ) : (
                        labelNode
                      )}
                      <span aria-hidden data-slot="breakdown-bar" className="mt-1.5 block h-1.5 rounded-full bg-nq-surface-soft">
                        <span className="block h-full rounded-full bg-[var(--bar)]" style={{ "--bar": color, width: `${width}%` } as CSSProperties} />
                      </span>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      <Num value={row.value} format={format} />
                    </TableCell>
                    {showShare ? (
                      <TableCell className="hidden text-end tabular-nums text-muted-foreground sm:table-cell">
                        <Num value={total > 0 ? row.value / total : 0} format={{ style: "percent", maximumFractionDigits: 1 }} />
                      </TableCell>
                    ) : null}
                    {hasPrevious ? (
                      <TableCell className={cn("text-end tabular-nums", good === undefined ? "text-muted-foreground" : good ? "text-nq-success-text" : "text-nq-danger-text")}>
                        {delta === undefined ? "–" : <Num value={delta} format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }} />}
                      </TableCell>
                    ) : null}
                    {columns?.map((c) => (
                      <TableCell key={c.id} className={c.align === "end" ? "text-end tabular-nums" : undefined}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {!loading && sorted.length > limit ? (
          <div className="flex justify-center px-4 pt-3">
            <Button size="sm" variant="ghost" onClick={() => setAll((v) => !v)} aria-expanded={all}>
              {all ? t.showLess : t.showAll(sorted.length)}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
