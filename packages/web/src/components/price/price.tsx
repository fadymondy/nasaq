"use client";

import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { useFormatNumber } from "../numeric";

export type PricePeriod = "month" | "year" | "seat-month" | "once";

const PERIOD: Record<Exclude<PricePeriod, "once">, { en: string; ar: string }> = {
  month: { en: "/mo", ar: "/شهريًا" },
  year: { en: "/yr", ar: "/سنويًا" },
  "seat-month": { en: "/seat/mo", ar: "/للمقعد شهريًا" },
};

const sizes = {
  sm: { root: "text-body-sm", amount: "font-medium" },
  md: { root: "text-body", amount: "font-medium" },
  lg: { root: "text-body-sm", amount: "text-h2 font-semibold tracking-tight" },
} as const;

export interface PriceProps extends Omit<ComponentProps<"span">, "children"> {
  /** The price. 0 renders the free label. */
  amount: number;
  /** ISO 4217 code. Default "USD". */
  currency?: string;
  /** Billing period suffix. Default "once" (no suffix). */
  period?: PricePeriod;
  /** The price before a discount, shown struck through after the amount. */
  compareAt?: number;
  /** Shown when `amount` is 0. Default "Free" / "مجاني". */
  freeLabel?: string;
  /** Fraction digits. Default 0 for whole amounts, 2 otherwise. */
  fractionDigits?: number;
  size?: keyof typeof sizes;
}

/**
 * A price with its currency, billing period and optional struck-through original. Formatting comes from the
 * active locale ("$12" / "12 US$") with the Nasaq digit set, and the figure is isolated so it keeps its order
 * inside Arabic text.
 */
export function Price({ amount, currency = "USD", period = "once", compareAt, freeLabel, fractionDigits, size = "md", className, ...props }: PriceProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const fmt = useFormatNumber();
  const s = sizes[size];
  const money = (value: number) => {
    const digits = fractionDigits ?? (Number.isInteger(value) ? 0 : 2);
    return fmt(value, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
  };

  if (amount === 0) {
    return (
      <span data-slot="price" data-free="" className={cn("text-foreground", s.root, className)} {...props}>
        <span className={s.amount}>{freeLabel ?? (ar ? "مجاني" : "Free")}</span>
      </span>
    );
  }
  return (
    <span data-slot="price" className={cn("inline-flex flex-wrap items-baseline gap-x-1.5 text-foreground", s.root, className)} {...props}>
      <span>
        <bdi className={cn("tabular-nums", s.amount)}>{money(amount)}</bdi>
        {period !== "once" && <span className="text-muted-foreground">{PERIOD[period][ar ? "ar" : "en"]}</span>}
      </span>
      {compareAt !== undefined && compareAt > amount && (
        <s className="text-caption text-muted-foreground decoration-muted-foreground/60">
          <span className="sr-only">{ar ? "بدلًا من " : "was "}</span>
          <bdi className="tabular-nums">{money(compareAt)}</bdi>
        </s>
      )}
    </span>
  );
}
