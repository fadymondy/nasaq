"use client";

import { Star } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { useFormatNumber } from "../numeric";

export interface RatingProps extends Omit<ComponentProps<"span">, "children"> {
  /** Average score, e.g. 4.8. */
  value: number;
  /** Top of the scale. Default 5. */
  max?: number;
  /** How many people or workspaces rated or use it. Shown compact: 2.1K. */
  count?: number;
  /** What `count` counts: "workspaces", "reviews". Localise it. */
  countLabel?: string;
}

/**
 * A single star, the average and an optional count: "★ 4.8 · 2.1K workspaces". One star, not five: a row of
 * part-filled stars is hard to read at small sizes and says nothing the number doesn't.
 */
export function Rating({ value, max = 5, count, countLabel, className, ...props }: RatingProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const fmt = useFormatNumber();
  const score = fmt(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const total = count === undefined ? "" : fmt(count, { notation: "compact" });
  const spoken = ar
    ? `التقييم ${score} من ${max}${count === undefined ? "" : `، ${total} ${countLabel ?? ""}`}`
    : `Rated ${score} out of ${max}${count === undefined ? "" : `, ${total} ${countLabel ?? ""}`}`;
  return (
    <span data-slot="rating" className={cn("inline-flex items-center gap-1.5 text-caption text-muted-foreground", className)} {...props}>
      <span className="sr-only">{spoken.trim()}</span>
      <Star aria-hidden className="size-3.5 shrink-0 fill-nq-accent text-nq-accent" />
      <bdi aria-hidden className="tabular-nums text-foreground">
        {score}
      </bdi>
      {count !== undefined && (
        <span aria-hidden className="truncate">
          <span className="me-1.5">·</span>
          <bdi className="tabular-nums">{total}</bdi>
          {countLabel ? ` ${countLabel}` : null}
        </span>
      )}
    </span>
  );
}
