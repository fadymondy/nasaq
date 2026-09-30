"use client";

import { cn } from "../../lib/cn";
import { minorToMajor } from "../currency-input/currency-input-logic";
import { Num } from "../numeric";
import { Price, type PriceProps } from "../price";

export interface StoreCartMoneyProps extends Omit<PriceProps, "amount" | "currency" | "compareAt"> {
  /** Integer minor units (piasters, cents). */
  amount: number;
  currency: string;
  /** The price before a discount, minor units. */
  compareAt?: number;
}

/** `Price` for minor units: converts by the currency's decimals, so 34900 EGP-piasters shows "EGP 349". */
export function StoreCartMoney({ amount, currency, compareAt, ...props }: StoreCartMoneyProps) {
  return <Price amount={minorToMajor(amount, currency)} currency={currency} {...(compareAt ? { compareAt: minorToMajor(compareAt, currency) } : {})} {...props} />;
}

/** A plain figure in minor units, without the free label, for sums and negatives ("−EGP 100"). */
export function StoreAmount({ amount, currency, className }: { amount: number; currency: string; className?: string }) {
  const major = minorToMajor(amount, currency);
  return <Num value={major} className={cn("text-foreground", className)} format={{ style: "currency", currency, minimumFractionDigits: Number.isInteger(major) ? 0 : 2, maximumFractionDigits: Number.isInteger(major) ? 0 : 2 }} />;
}
