"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { useFormatNumber } from "../numeric";
import { Price, type PricePeriod } from "../price";
import { useCurrency } from "../../provider/nasaq-provider";

export interface BundleCardProps extends Omit<ComponentProps<"article">, "title"> {
  /** The bundled products' artwork or glyphs, in order. They overlap like a stack of cards. */
  items: ReactNode[];
  title: ReactNode;
  description?: ReactNode;
  /** What's inside, as a line of names. */
  includes?: ReactNode;
  /** Bundle price. */
  price: number;
  /** The same apps bought separately. The saving badge is `compareAt - price`. */
  compareAt: number;
  currency?: string;
  period?: PricePeriod;
  /** Override the saving badge text. Default "Save $18" / "وفّر 18 US$". */
  savingsLabel?: ReactNode;
  action?: ReactNode;
}

/**
 * Several apps sold together for less. Shows the stack, what it's for, the saving and the price against the
 * separate total. Stacks vertically in a narrow container and lays out in a row from 36rem.
 */
export function BundleCard({ items, title, description, includes, price, compareAt, currency: currencyProp, period = "month", savingsLabel, action, className, ...props }: BundleCardProps) {
  const currency = useCurrency(currencyProp);
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const fmt = useFormatNumber();
  const saving = compareAt - price;
  const saved = fmt(saving, { style: "currency", currency, maximumFractionDigits: Number.isInteger(saving) ? 0 : 2 });
  return (
    <div data-slot="bundle-card" className="@container">
      <article className={cn("flex flex-col gap-5 rounded-card bg-nq-surface p-5 @xl:flex-row @xl:items-center @xl:p-6", className)} {...props}>
        <div aria-hidden className="flex shrink-0 [&>*]:size-14 [&>*+*]:-ms-3">
          {items.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: positional, never reordered
            <span key={i} className="overflow-hidden rounded-card ring-2 ring-nq-surface [&>*]:size-full">
              {item}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-h3 text-foreground">{title}</h3>
            {saving > 0 && (
              <Badge variant="success">
                {savingsLabel ?? (
                  <>
                    {ar ? "وفّر" : "Save"} <bdi className="tabular-nums">{saved}</bdi>
                  </>
                )}
              </Badge>
            )}
          </div>
          {description && <p className="text-pretty text-body-sm text-muted-foreground">{description}</p>}
          {includes && <p className="text-caption text-muted-foreground">{includes}</p>}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 @xl:flex-col @xl:items-end">
          <Price amount={price} compareAt={compareAt} currency={currency} period={period} size="lg" className="@xl:justify-end" />
          {action}
        </div>
      </article>
    </div>
  );
}
