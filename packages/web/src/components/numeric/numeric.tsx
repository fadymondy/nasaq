"use client";

import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";

type Digits = "latn" | "arab";

export interface FormatNumberOptions extends Intl.NumberFormatOptions {
  /**
   * Digit set. Default "latn": Nasaq renders Western digits in Arabic UI too, so figures line up in
   * tables and match what users type and paste. Pass "arab" for editorial copy that wants ٠١٢٣.
   */
  numberingSystem?: Digits;
}

export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  /** Same rule as numbers: "latn" by default. Plain `Intl.DateTimeFormat("ar")` gives ٢٩/٩/٢٠٢٦. */
  numberingSystem?: Digits;
}

// Intl.Locale overrides any existing -u-nu- extension instead of appending a second one.
const withDigits = (locale: string, numberingSystem: Digits) => new Intl.Locale(locale, { numberingSystem }).toString();

/** Latin letters: an ISO code or "US$" that must keep its own order inside an RTL figure. */
const LATIN = /[A-Za-z]/;

/**
 * Locale-aware formatting (grouping, decimal mark, percent/currency placement) with a fixed digit set.
 *
 * Arabic puts the currency after the figure ("48,210 US$"). Intl marks the figure's direction but not a
 * Latin symbol's, so in RTL the `$` (a neutral) drifts to the far side and reads "$US". A currency part
 * with Latin letters is wrapped in an LTR isolate (LRI…PDI), which works in plain strings as well as markup.
 */
export function formatNumber(value: number | bigint, locale: string, { numberingSystem = "latn", ...options }: FormatNumberOptions = {}) {
  const format = new Intl.NumberFormat(withDigits(locale, numberingSystem), options);
  if (options.style !== "currency") return format.format(value);
  return format
    .formatToParts(value)
    .map((part) => (part.type === "currency" && LATIN.test(part.value) ? `\u2066${part.value}\u2069` : part.value))
    .join("");
}

/** `formatNumber` bound to the active locale ("en" outside a NasaqProvider). */
export function useFormatNumber() {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return (value: number | bigint, options?: FormatNumberOptions) => formatNumber(value, locale, options);
}

export interface NumProps extends Omit<ComponentProps<"bdi">, "children"> {
  value: number | bigint;
  /** Intl options, e.g. `{ style: "percent" }`, `{ style: "currency", currency: "SAR" }`, `{ notation: "compact" }`. */
  format?: FormatNumberOptions;
}

/**
 * A formatted figure: tabular digits (columns align, values don't jitter as they update) and bidi
 * isolation, so "-12.5%" or "SAR 1,200" keeps its order inside Arabic sentences.
 */
export function Num({ value, format, className, ...props }: NumProps) {
  const fmt = useFormatNumber();
  return (
    <bdi data-slot="num" data-numeric="" className={cn("tabular-nums", className)} {...props}>
      {fmt(value, format)}
    </bdi>
  );
}

type DateInput = Date | number | string;
const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));
const orMedium = (options: Intl.DateTimeFormatOptions) => (Object.keys(options).length ? options : { dateStyle: "medium" as const });

/**
 * Locale-aware date/time with the Nasaq digit set. Intl already inserts the right-to-left marks Arabic
 * needs between the parts, so the result reads correctly inside an Arabic sentence as is. Defaults to
 * `{ dateStyle: "medium" }`.
 */
export function formatDate(value: DateInput, locale: string, { numberingSystem = "latn", ...options }: FormatDateOptions = {}) {
  return new Intl.DateTimeFormat(withDigits(locale, numberingSystem), orMedium(options)).format(toDate(value));
}

/** "Sep 1 – 29, 2026" / "1–29 سبتمبر 2026": shared parts are written once. */
export function formatDateRange(start: DateInput, end: DateInput, locale: string, { numberingSystem = "latn", ...options }: FormatDateOptions = {}) {
  return new Intl.DateTimeFormat(withDigits(locale, numberingSystem), orMedium(options)).formatRange(toDate(start), toDate(end));
}

export interface FormatRelativeTimeOptions extends Intl.RelativeTimeFormatOptions {
  /** Defaults to the current time. */
  now?: DateInput;
  numberingSystem?: Digits;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

/** "3 hours ago" / "قبل 3 ساعات", in the largest unit that fits. */
export function formatRelativeTime(value: DateInput, locale: string, { now = Date.now(), numberingSystem = "latn", ...options }: FormatRelativeTimeOptions = {}) {
  const seconds = (toDate(value).getTime() - toDate(now).getTime()) / 1000;
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ["second", 1];
  return new Intl.RelativeTimeFormat(withDigits(locale, numberingSystem), { numeric: "auto", ...options }).format(Math.round(seconds / size), unit);
}

/** `formatDate`, `formatDateRange` and `formatRelativeTime` bound to the active locale ("en" outside a NasaqProvider). */
export function useFormatDate() {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return {
    date: (value: DateInput, options?: FormatDateOptions) => formatDate(value, locale, options),
    range: (start: DateInput, end: DateInput, options?: FormatDateOptions) => formatDateRange(start, end, locale, options),
    relative: (value: DateInput, options?: FormatRelativeTimeOptions) => formatRelativeTime(value, locale, options),
  };
}

export interface DateTimeProps extends Omit<ComponentProps<"time">, "children" | "dateTime"> {
  value: DateInput;
  format?: FormatDateOptions;
  /** Show "3 hours ago"; the absolute date moves to the `title`. */
  relative?: boolean;
}

/**
 * A date as `<time>`: machine-readable `dateTime`, locale formatting, Nasaq digits, and its own bidi
 * isolate, so a date inside a sentence of the other direction keeps its order.
 */
export function DateTime({ value, format, relative = false, className, title, ...props }: DateTimeProps) {
  const fmt = useFormatDate();
  const date = toDate(value);
  const absolute = fmt.date(date, format);
  return (
    <time
      data-slot="date-time"
      dateTime={date.toISOString()}
      // Like <bdi>: the text's own first strong character sets its direction ("3 hours ago" in Arabic text).
      dir="auto"
      title={title ?? (relative ? absolute : undefined)}
      // "3 minutes ago" can differ by a tick between server and client render.
      suppressHydrationWarning={relative}
      className={cn("tabular-nums [unicode-bidi:isolate]", className)}
      {...props}
    >
      {relative ? fmt.relative(date) : absolute}
    </time>
  );
}
