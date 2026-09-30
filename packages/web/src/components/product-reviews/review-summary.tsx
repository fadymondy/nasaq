"use client";

import { Star } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useFormatNumber } from "../numeric";
import { Rating } from "../rating";
import { fitSummary, histogramPercent, STAR_LEVELS, type ReviewFit, type ReviewSummary, type StarLevel } from "./review-logic";
import { type ProductReviewsLabels, useReviewStrings } from "./review-strings";

export interface ProductReviewSummaryProps extends Omit<ComponentProps<"section">, "onChange"> {
  summary: ReviewSummary;
  /** Star levels currently filtering the list; their rows are pressed. */
  selectedStars?: readonly StarLevel[];
  /** Called when a histogram row is chosen. Omit to render the histogram read-only. */
  onToggleStar?: (level: StarLevel) => void;
  /** Fit split from the reviews, shown as a three-way bar when at least one reviewer answered. */
  fit?: ReturnType<typeof fitSummary>;
  labels?: ProductReviewsLabels;
}

/**
 * The rating at a glance: the average, the review count and a star histogram. Each histogram row is a
 * toggle button: choose it to filter the reviews to that many stars.
 */
export function ProductReviewSummary({ summary, selectedStars, onToggleStar, fit, labels, className, ...props }: ProductReviewSummaryProps) {
  const { t } = useReviewStrings(labels);
  const fmt = useFormatNumber();
  const selected = new Set<number>(selectedStars ?? []);
  const fitRows: { key: ReviewFit; label: string; pct: number }[] = fit && fit.answered ? [
    { key: "small", label: t.fitSmall, pct: fit.small },
    { key: "true", label: t.fitTrue, pct: fit.true },
    { key: "large", label: t.fitLarge, pct: fit.large },
  ] : [];
  return (
    <section data-slot="product-review-summary" aria-label={t.reviews} className={cn("grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10", className)} {...props}>
      <div className="flex flex-col gap-1">
        <p className="flex items-baseline gap-2">
          <bdi className="text-display tabular-nums text-foreground">{fmt(summary.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</bdi>
          <span className="text-body text-muted-foreground">/ <bdi>{fmt(5)}</bdi></span>
        </p>
        <Rating value={summary.average} count={summary.count} countLabel={t.reviewsCount} />
        <p className="text-caption text-muted-foreground">{t.basedOn(fmt(summary.count), summary.count)}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <ul role="group" aria-label={t.histogram} className="flex flex-col gap-1">
          {STAR_LEVELS.map((level) => {
            const count = summary.histogram[level];
            const pct = histogramPercent(summary.histogram, level, summary.count);
            const on = selected.has(level);
            const row = (
              <>
                <span className="inline-flex w-9 shrink-0 items-center gap-1 text-label tabular-nums text-foreground">
                  <bdi>{fmt(level)}</bdi>
                  <Star aria-hidden className="size-3.5 fill-nq-accent text-nq-accent" />
                </span>
                <span aria-hidden className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                  <span className="absolute inset-y-0 start-0 rounded-full bg-nq-accent transition-[width] duration-300 ease-nq motion-reduce:transition-none" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-10 shrink-0 text-end text-caption tabular-nums text-muted-foreground">
                  <bdi>{fmt(count)}</bdi>
                </span>
              </>
            );
            return (
              <li key={level}>
                {onToggleStar ? (
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={t.filterByStars(fmt(level), fmt(count))}
                    onClick={() => onToggleStar(level)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-control px-2 py-1 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
                      on && "bg-nq-selected",
                    )}
                  >
                    {row}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-2 py-1" role="text" aria-label={`${t.starsRow(fmt(level))}, ${fmt(count)}`}>
                    {row}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {fitRows.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-label text-foreground">{t.fitSummary(fmt(fit!.answered))}</p>
            <div role="img" aria-label={fitRows.map((r) => `${r.label} ${fmt(r.pct / 100, { style: "percent" })}`).join(", ")} className="flex h-2 overflow-hidden rounded-full bg-secondary">
              {fitRows.map((r, i) => (
                <span key={r.key} className={cn("h-full", i === 1 ? "bg-nq-success" : "bg-nq-line-strong")} style={{ width: `${r.pct}%` }} />
              ))}
            </div>
            <ul className="flex justify-between gap-2 text-caption text-muted-foreground">
              {fitRows.map((r) => (
                <li key={r.key}>
                  {r.label} <bdi className="tabular-nums">{fmt(r.pct / 100, { style: "percent" })}</bdi>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
