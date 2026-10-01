"use client";

import { CircleAlert, Infinity as InfinityIcon, TriangleAlert, Zap } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { defaultCurrency, useCurrency, useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { formatNumber } from "../numeric";
import { type ProgressTone, Meter } from "../progress";
import { Skeleton } from "../states";
import { burnProjection, overageAmount, overageTotal, usageTone, type UsageThresholds, type UsageTone } from "./usage-math";

const STRINGS = {
  en: {
    unlimited: "Unlimited",
    of: "of",
    left: (n: string) => `${n} left`,
    warning: "Approaching the limit",
    danger: "Almost at the limit",
    over: (n: string) => `Over the limit by ${n}`,
    hoursUnit: "h",
    hours: "Hours",
    budget: "Budget",
    projectedOver: (projected: string, over: string) => `On pace for ${projected}, ${over} over budget`,
    projectedWithin: (projected: string) => `On pace for ${projected}`,
    periodElapsed: (pct: string) => `${pct} of the period has passed`,
    planUsage: "Plan usage",
    plan: (name: string) => `${name} plan`,
    period: "Current period",
    overageTitle: "Estimated overage",
    overageNone: "No overage so far",
    overageNoneBody: "Everything is within your plan limits.",
    overageBody: "Charged with your next invoice if usage stays this high.",
    overageLine: (label: string, over: string, amount: string) => `${label}: ${over} over, ${amount}`,
    upgrade: "Upgrade plan",
    loading: "Loading usage",
  },
  ar: {
    unlimited: "غير محدود",
    of: "من",
    left: (n: string) => `متبقٍ ${n}`,
    warning: "اقتربت من الحد",
    danger: "أوشكت على بلوغ الحد",
    over: (n: string) => `تجاوزت الحد بمقدار ${n}`,
    hoursUnit: "س",
    hours: "الساعات",
    budget: "الميزانية",
    projectedOver: (projected: string, over: string) => `الوتيرة الحالية تصل إلى ${projected}، أي ${over} فوق الميزانية`,
    projectedWithin: (projected: string) => `الوتيرة الحالية تصل إلى ${projected}`,
    periodElapsed: (pct: string) => `مضى ${pct} من الفترة`,
    planUsage: "استخدام الباقة",
    plan: (name: string) => `باقة ${name}`,
    period: "الفترة الحالية",
    overageTitle: "التجاوز التقديري",
    overageNone: "لا تجاوز حتى الآن",
    overageNoneBody: "كل شيء ضمن حدود باقتك.",
    overageBody: "يُحاسَب مع فاتورتك القادمة إذا بقي الاستخدام بهذا المستوى.",
    overageLine: (label: string, over: string, amount: string) => `${label}: تجاوز ${over}، ${amount}`,
    upgrade: "ترقية الباقة",
    loading: "جارٍ تحميل الاستخدام",
  },
};

export type UsageMeterLabels = Partial<typeof STRINGS.en>;

function useLabels(labels?: UsageMeterLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } };
}

export type UsageKind = "count" | "money" | "hours";

/** Formats an amount of a usage kind: "1,200 seats", "$45", "12.5 h". The result is a plain string; wrap it in `<bdi>`. */
function formatAmount(value: number, kind: UsageKind, locale: string, t: { hoursUnit: string }, unit?: string, currency = defaultCurrency(locale)) {
  if (kind === "money") {
    const whole = Number.isInteger(value);
    return formatNumber(value, locale, { style: "currency", currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  }
  const n = formatNumber(value, locale, { maximumFractionDigits: kind === "hours" ? 1 : 2 });
  const suffix = kind === "hours" ? t.hoursUnit : unit;
  return suffix ? `${n} ${suffix}` : n;
}

const meterTone: Record<UsageTone, ProgressTone> = { ok: "default", warning: "warning", danger: "danger", over: "danger" };
const statusText: Record<UsageTone, string> = { ok: "", warning: "text-nq-warning-text", danger: "text-nq-danger-text", over: "text-nq-danger-text" };

export interface UsageMeterProps extends Omit<ComponentProps<"div">, "children"> {
  /** What is metered: "Seats", "API calls", "Storage". Localise it. */
  label: ReactNode;
  /** Plain-text name for the meter's accessible name, when `label` is a node. */
  ariaLabel?: string;
  used: number;
  /** The limit. `null` is unlimited: no bar, just the amount used. */
  limit: number | null;
  /** `count` (default) with an optional `unit`, `money` in `currency`, or `hours`. */
  kind?: UsageKind;
  /** Noun after a count: "seats", "GB". Localise it. */
  unit?: string;
  /** ISO 4217 code for `money`. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Fraction at which the fill turns warning (default 0.75) and danger (default 0.9). */
  thresholds?: UsageThresholds;
  /** A position on the bar as a fraction (0 to 1): how much of the period has gone. Draws a tick. */
  marker?: number;
  /** A line at the end of the row, for example a projection or "Resets on 1 Oct". Replaces the remaining amount. */
  hint?: ReactNode;
  size?: "sm" | "md";
  labels?: UsageMeterLabels;
}

/**
 * A quantity used against its limit: a count, money or hours. The bar turns warning at 75% and danger at 90%
 * (adjustable), and past the limit it says by how much. State is spelled out with an icon and text, never colour alone.
 * Unlimited plans show the amount used and an Unlimited badge instead of a bar.
 */
export function UsageMeter({ label, ariaLabel, used, limit, kind = "count", unit, currency, thresholds, marker, hint, size = "md", className, labels, ...props }: UsageMeterProps) {
  const { locale, t } = useLabels(labels);
  const tone = usageTone(used, limit, thresholds);
  const amount = (n: number) => formatAmount(n, kind, locale, t, unit, currency);
  const name = ariaLabel ?? (typeof label === "string" ? label : undefined);
  const StatusIcon = tone === "warning" ? TriangleAlert : CircleAlert;

  return (
    <div data-slot="usage-meter" data-tone={tone} data-unlimited={limit === null || undefined} className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props}>
      <div className="flex items-baseline justify-between gap-3 text-body-sm">
        <span data-slot="usage-meter-label" className="min-w-0 truncate text-label text-foreground">
          {label}
        </span>
        <span data-slot="usage-meter-value" className="shrink-0 text-muted-foreground tabular-nums">
          <bdi className="text-foreground">{amount(used)}</bdi>
          {limit === null ? null : (
            <>
              {" "}
              {t.of} <bdi>{amount(limit)}</bdi>
            </>
          )}
        </span>
      </div>
      {limit === null ? (
        <div>
          <Badge variant="neutral" data-slot="usage-meter-unlimited">
            <InfinityIcon aria-hidden />
            {t.unlimited}
          </Badge>
        </div>
      ) : (
        <div className="relative">
          <Meter
            aria-label={name}
            size={size}
            value={limit > 0 ? Math.min(used, limit) : used > 0 ? 1 : 0}
            max={limit > 0 ? limit : 1}
            tone={meterTone[tone]}
            valueText={`${amount(used)} ${t.of} ${amount(limit)}`}
          />
          {marker !== undefined ? (
            <span
              data-slot="usage-meter-marker"
              aria-hidden
              className="pointer-events-none absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-foreground/60"
              style={{ insetInlineStart: `${Math.min(100, Math.max(0, marker * 100))}%` }}
            />
          ) : null}
        </div>
      )}
      {limit !== null && (tone !== "ok" || hint !== undefined || limit > used) ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 text-caption text-muted-foreground">
          {tone !== "ok" ? (
            <span data-slot="usage-meter-status" role={tone === "over" ? "alert" : undefined} className={cn("inline-flex items-center gap-1 text-label", statusText[tone])}>
              <StatusIcon aria-hidden className="size-3.5 shrink-0" />
              {tone === "over" ? t.over(amount(used - limit)) : tone === "danger" ? t.danger : t.warning}
            </span>
          ) : (
            <span />
          )}
          {hint !== undefined ? <span>{hint}</span> : tone !== "over" ? <span>{t.left(amount(Math.max(0, limit - used)))}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ BudgetBurn */

export interface BudgetBurnProps extends Omit<ComponentProps<"div">, "children"> {
  /** Hours used against the hours budget. */
  hours?: { used: number; budget: number };
  /** Money spent against the money budget. */
  money?: { used: number; budget: number; currency?: string };
  /** Fraction of the period that has passed (0 to 1). Draws a tick and drives the projection. */
  elapsed?: number;
  thresholds?: UsageThresholds;
  labels?: UsageMeterLabels;
}

/**
 * A project or period budget in hours and money, with the pace. When `elapsed` is given each bar shows where the period
 * stands and projects the end-of-period figure at the current rate, so a burn that is fast but still under the limit is visible.
 */
export function BudgetBurn({ hours, money, elapsed, thresholds, className, labels, ...props }: BudgetBurnProps) {
  const { locale, t } = useLabels(labels);
  const hint = (used: number, budget: number, kind: UsageKind, currency?: string): ReactNode => {
    if (elapsed === undefined) return undefined;
    const p = burnProjection(used, budget, elapsed);
    const f = (n: number) => formatAmount(n, kind, locale, t, undefined, currency);
    return p.willExceed ? t.projectedOver(f(p.projected), f(p.overBy)) : t.projectedWithin(f(p.projected));
  };
  return (
    <div data-slot="budget-burn" className={cn("flex flex-col gap-4", className)} {...props}>
      {hours ? <UsageMeter label={t.hours} kind="hours" used={hours.used} limit={hours.budget} thresholds={thresholds} marker={elapsed} hint={hint(hours.used, hours.budget, "hours")} labels={labels} /> : null}
      {money ? (
        <UsageMeter label={t.budget} kind="money" currency={money.currency} used={money.used} limit={money.budget} thresholds={thresholds} marker={elapsed} hint={hint(money.used, money.budget, "money", money.currency)} labels={labels} />
      ) : null}
      {elapsed !== undefined ? <p className="text-caption text-muted-foreground">{t.periodElapsed(formatNumber(elapsed, locale, { style: "percent", maximumFractionDigits: 0 }))}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ UsageSummary */

export interface UsageItem {
  id: string;
  label: ReactNode;
  used: number;
  /** `null` is unlimited. */
  limit: number | null;
  kind?: UsageKind;
  unit?: string;
  /** Price of each unit past the limit, in `currency`. Adds the item to the overage estimate. */
  overageRate?: number;
  hint?: ReactNode;
}

export interface UsageSummaryProps extends Omit<ComponentProps<typeof Card>, "children"> {
  /** Plan name: "Team". */
  planName: ReactNode;
  /** Which period this is: "1 Sep to 30 Sep". Localise it. */
  period?: ReactNode;
  items: readonly UsageItem[];
  /** ISO 4217 code for the overage estimate and money items. Default USD, or SAR in Arabic. */
  currency?: string;
  thresholds?: UsageThresholds;
  /** Shows Upgrade plan when something is near or over its limit. */
  onUpgrade?: () => void;
  loading?: boolean;
  labels?: UsageMeterLabels;
}

/**
 * The plan usage page section: every metered resource against the plan, then a strip with the estimated overage
 * and a line per item that went over. Money and counts stay left-to-right and isolated inside Arabic text.
 */
export function UsageSummary({ planName, period, items, currency: currencyProp, thresholds, onUpgrade, loading = false, className, labels, ...props }: UsageSummaryProps) {
  const currency = useCurrency(currencyProp);
  const { locale, t } = useLabels(labels);
  const money = (n: number) => formatAmount(n, "money", locale, t, undefined, currency);
  const total = overageTotal(items);
  const over = items.filter((i) => overageAmount(i) > 0);
  const pressed = items.some((i) => usageTone(i.used, i.limit, thresholds) !== "ok");

  return (
    <Card data-slot="usage-summary" aria-busy={loading || undefined} className={className} {...props}>
      <CardHeader>
        <CardTitle as="h3" className="flex items-center gap-2">
          {t.planUsage} <Badge variant="brand">{typeof planName === "string" ? t.plan(planName) : planName}</Badge>
        </CardTitle>
        <CardDescription>{period ?? t.period}</CardDescription>
        {onUpgrade && pressed ? (
          <CardAction>
            <Button variant="primary" size="sm" onClick={onUpgrade}>
              <Zap />
              {t.upgrade}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {loading ? (
          <div role="status" aria-label={t.loading} className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {items.map((item) => (
              <UsageMeter key={item.id} label={item.label} used={item.used} limit={item.limit} kind={item.kind} unit={item.unit} currency={currency} hint={item.hint} thresholds={thresholds} labels={labels} />
            ))}
          </div>
        )}
        {loading ? null : (
          <Alert data-slot="usage-overage-strip" tone={total > 0 ? "warning" : "success"} title={total > 0 ? undefined : t.overageNone}>
            {total > 0 ? (
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-label">{t.overageTitle}</span>
                  <bdi data-slot="usage-overage-total" className="text-h3 tabular-nums">
                    {money(total)}
                  </bdi>
                </div>
                <span>{t.overageBody}</span>
                <ul className="mt-1 flex flex-col gap-0.5 text-caption">
                  {over.map((i) => (
                    <li key={i.id}>{t.overageLine(typeof i.label === "string" ? i.label : i.id, formatAmount(i.used - (i.limit ?? 0), i.kind ?? "count", locale, t, i.unit, currency), money(overageAmount(i)))}</li>
                  ))}
                </ul>
              </div>
            ) : (
              t.overageNoneBody
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
