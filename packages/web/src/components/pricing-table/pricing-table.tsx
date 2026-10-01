"use client";

import { Check, Minus } from "lucide-react";
import { type ComponentProps, Fragment, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useCurrency, useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { PlanCard, type PlanFeature, PlanGrid } from "../plan-card";
import { Price } from "../price";
import { RadioCard, RadioGroup } from "../radio-group";
import { Toggle, ToggleGroup } from "../toggle-group";
import { Tooltip } from "../tooltip";

export type BillingPeriod = "month" | "year";

/** One plan, as data. `PricingTable`, `PlanComparison`, `PlanPicker` and `UpgradeDialog` all read this shape. */
export interface PricingPlan {
  id: string;
  name: ReactNode;
  /** Who it's for, one line. */
  description?: ReactNode;
  /** Price per month, billed monthly. `0` is free. */
  monthly?: number;
  /** Price per month, billed yearly (120/yr is `10`). Leave out when the plan has no yearly price. */
  yearly?: number;
  /** Priced per seat: the period reads "/seat/mo". */
  perSeat?: boolean;
  /** Shown instead of a price, for plans you sell by talking: "Custom". The button becomes "Contact sales". */
  custom?: ReactNode;
  features?: (ReactNode | PlanFeature)[];
  /** A small heading over the features: "Everything in Solo, plus". */
  featuresTitle?: ReactNode;
  /** "Most popular". */
  badge?: ReactNode;
  /** The recommended plan. At most one. */
  highlighted?: boolean;
  /** A free trial length. The button reads "Start 14-day free trial". */
  trialDays?: number;
  /** Override the button label. */
  cta?: ReactNode;
  /** Fine print under the button. */
  footnote?: ReactNode;
}

export interface PricingLabels {
  monthly: string;
  yearly: string;
  save: (percent: number) => string;
  billedYearly: (total: string) => string;
  billedMonthly: string;
  current: string;
  getStarted: string;
  choose: (name: string) => string;
  upgrade: string;
  downgrade: string;
  trial: (days: number) => string;
  contactSales: string;
  included: string;
  notIncluded: string;
  feature: string;
  period: string;
}

const STRINGS: Record<"en" | "ar", PricingLabels> = {
  en: {
    monthly: "Monthly",
    yearly: "Yearly",
    save: (p) => `Save ${p}%`,
    billedYearly: (total) => `Billed ${total} yearly`,
    billedMonthly: "Billed monthly",
    current: "Current plan",
    getStarted: "Get started",
    choose: (name) => `Choose ${name}`,
    upgrade: "Upgrade",
    downgrade: "Downgrade",
    trial: (d) => `Start ${d}-day free trial`,
    contactSales: "Contact sales",
    included: "Included",
    notIncluded: "Not included",
    feature: "Feature",
    period: "Billing period",
  },
  ar: {
    monthly: "شهري",
    yearly: "سنوي",
    save: (p) => `وفّر ${p}٪`,
    billedYearly: (total) => `تُدفع ${total} سنويًا`,
    billedMonthly: "تُدفع شهريًا",
    current: "خطتك الحالية",
    getStarted: "ابدأ الآن",
    choose: (name) => `اختر ${name}`,
    upgrade: "ترقية",
    downgrade: "تخفيض الخطة",
    trial: (d) => `ابدأ تجربة مجانية لمدة ${d} يومًا`,
    contactSales: "تواصل مع المبيعات",
    included: "مشمول",
    notIncluded: "غير مشمول",
    feature: "الميزة",
    period: "دورة الفوترة",
  },
};

export function usePricingLabels(labels?: Partial<PricingLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } };
}

/** The price shown for a plan in a period: per month, with the monthly price as `compareAt` when yearly is cheaper. */
export function planPrice(plan: PricingPlan, period: BillingPeriod): { amount: number; compareAt?: number } | null {
  const amount = period === "year" ? (plan.yearly ?? plan.monthly) : (plan.monthly ?? plan.yearly);
  if (amount === undefined) return null;
  const compareAt = period === "year" && plan.yearly !== undefined && plan.monthly !== undefined && plan.monthly > plan.yearly ? plan.monthly : undefined;
  return { amount, compareAt };
}

/** The best yearly saving across plans, as a whole percent. 0 when yearly is never cheaper. */
export function yearlySavings(plans: PricingPlan[]): number {
  let best = 0;
  for (const p of plans) {
    if (p.monthly && p.yearly !== undefined && p.yearly < p.monthly) best = Math.max(best, Math.round((1 - p.yearly / p.monthly) * 100));
  }
  return best;
}

export interface BillingPeriodSwitchProps extends Omit<ComponentProps<"div">, "onChange"> {
  value: BillingPeriod;
  onValueChange: (period: BillingPeriod) => void;
  /** The yearly saving to advertise, in percent. Usually `yearlySavings(plans)`. 0 hides the badge. */
  savings?: number;
  labels?: Partial<PricingLabels>;
}

/** Monthly / Yearly, with the yearly saving on a badge. */
export function BillingPeriodSwitch({ value, onValueChange, savings = 0, labels, className, ...props }: BillingPeriodSwitchProps) {
  const { t } = usePricingLabels(labels);
  return (
    <div data-slot="billing-period-switch" className={cn("flex items-center gap-2", className)} {...props}>
      <ToggleGroup aria-label={t.period} value={[value]} onValueChange={(v) => v[0] && onValueChange(v[0] as BillingPeriod)}>
        <Toggle value="month" className="px-3">
          {t.monthly}
        </Toggle>
        <Toggle value="year" className="gap-2 px-3">
          {t.yearly}
          {savings > 0 ? (
            <Badge variant="accent" className="h-5 px-1.5">
              {t.save(savings)}
            </Badge>
          ) : null}
        </Toggle>
      </ToggleGroup>
    </div>
  );
}

function PlanPrice({ plan, period, currency, size = "lg" }: { plan: PricingPlan; period: BillingPeriod; currency: string; size?: "sm" | "md" | "lg" }) {
  if (plan.custom !== undefined) return <span className={cn("text-foreground", size === "lg" ? "text-h2 font-semibold tracking-tight" : "font-medium")}>{plan.custom}</span>;
  const price = planPrice(plan, period);
  if (!price) return null;
  return <Price amount={price.amount} compareAt={price.compareAt} currency={currency} period={plan.perSeat ? "seat-month" : "month"} size={size} />;
}

function usePriceNote(currency: string) {
  const nasaq = useOptionalNasaq();
  const locale = nasaq?.locale ?? "en";
  return (plan: PricingPlan, period: BillingPeriod, t: PricingLabels) => {
    if (plan.custom !== undefined) return undefined;
    const price = planPrice(plan, period);
    if (!price || price.amount === 0) return undefined;
    if (period === "year" && plan.yearly !== undefined) {
      const total = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0, numberingSystem: "latn" } as Intl.NumberFormatOptions).format(plan.yearly * 12);
      return t.billedYearly(total);
    }
    return t.billedMonthly;
  };
}

export interface PlanActionState {
  label: ReactNode;
  variant: "primary" | "secondary" | "ghost";
  disabled: boolean;
}

/** What a plan's button says and looks like, given where the account is now. */
export function planAction(plan: PricingPlan, plans: PricingPlan[], t: PricingLabels, currentPlanId?: string): PlanActionState {
  const name = typeof plan.name === "string" ? plan.name : "";
  if (plan.id === currentPlanId) return { label: t.current, variant: "secondary", disabled: true };
  const variant = plan.highlighted ? "primary" : "secondary";
  if (plan.cta) return { label: plan.cta, variant, disabled: false };
  if (plan.custom !== undefined) return { label: t.contactSales, variant: "secondary", disabled: false };
  if (currentPlanId) {
    const here = plans.findIndex((p) => p.id === currentPlanId);
    const there = plans.findIndex((p) => p.id === plan.id);
    if (here >= 0 && there >= 0) return there > here ? { label: `${t.upgrade}${name ? ` · ${name}` : ""}`, variant: plan.highlighted || there === here + 1 ? "primary" : "secondary", disabled: false } : { label: t.downgrade, variant: "ghost", disabled: false };
  }
  if (plan.trialDays) return { label: t.trial(plan.trialDays), variant, disabled: false };
  if ((plan.monthly ?? plan.yearly) === 0) return { label: t.getStarted, variant, disabled: false };
  return { label: name ? t.choose(name) : t.getStarted, variant, disabled: false };
}

export interface PricingTableProps extends Omit<ComponentProps<"div">, "onSelect"> {
  plans: PricingPlan[];
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  period?: BillingPeriod;
  defaultPeriod?: BillingPeriod;
  onPeriodChange?: (period: BillingPeriod) => void;
  /** The plan the account is on. Its card says "Current plan"; the others say Upgrade or Downgrade. */
  currentPlanId?: string;
  /** A plan's button. Return a promise to show the button busy until it settles (a checkout redirect). */
  onSelect?: (plan: PricingPlan, period: BillingPeriod) => void | Promise<unknown>;
  /** Hide the Monthly / Yearly switch. It is also hidden when no plan has a yearly price. */
  hidePeriodSwitch?: boolean;
  /** One line under the plans: "Prices in USD, excluding VAT. Cancel anytime." */
  note?: ReactNode;
  labels?: Partial<PricingLabels>;
}

/**
 * The pricing section: a Monthly / Yearly switch and one `PlanCard` per plan, built from data. Every card has
 * a working button that knows the account's current plan, so people can subscribe, upgrade or downgrade here.
 */
export function PricingTable({
  plans,
  currency: currencyProp,
  period: periodProp,
  defaultPeriod = "month",
  onPeriodChange,
  currentPlanId,
  onSelect,
  hidePeriodSwitch,
  note,
  labels,
  className,
  ...props
}: PricingTableProps) {
  const currency = useCurrency(currencyProp);
  const { t } = usePricingLabels(labels);
  const [inner, setInner] = useState<BillingPeriod>(defaultPeriod);
  const period = periodProp ?? inner;
  const setPeriod = (p: BillingPeriod) => {
    setInner(p);
    onPeriodChange?.(p);
  };
  const [pending, setPending] = useState<string | null>(null);
  const priceNote = usePriceNote(currency);
  const hasYearly = plans.some((p) => p.yearly !== undefined);

  const select = async (plan: PricingPlan) => {
    if (!onSelect || pending) return;
    const result = onSelect(plan, period);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setPending(plan.id);
      try {
        await result;
      } finally {
        setPending(null);
      }
    }
  };

  return (
    <div data-slot="pricing-table" className={cn("flex flex-col items-center gap-8", className)} {...props}>
      {hasYearly && !hidePeriodSwitch ? <BillingPeriodSwitch value={period} onValueChange={setPeriod} savings={yearlySavings(plans)} labels={labels} /> : null}
      <div className="w-full">
        <PlanGrid>
          {plans.map((plan) => {
            const action = planAction(plan, plans, t, currentPlanId);
            const busy = pending === plan.id;
            return (
              <PlanCard
                key={plan.id}
                name={plan.name}
                description={plan.description}
                highlighted={plan.highlighted}
                current={plan.id === currentPlanId}
                badge={plan.id === currentPlanId ? undefined : plan.badge}
                price={<PlanPrice plan={plan} period={period} currency={currency} />}
                priceNote={priceNote(plan, period, t)}
                featuresTitle={plan.featuresTitle}
                features={plan.features}
                footnote={plan.footnote}
                action={
                  <Button
                    size="lg"
                    variant={action.variant}
                    disabled={action.disabled || (pending !== null && !busy)}
                    aria-busy={busy || undefined}
                    onClick={() => select(plan)}
                  >
                    {action.label}
                  </Button>
                }
              />
            );
          })}
        </PlanGrid>
      </div>
      {note ? <p className="text-center text-caption text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/** A row of `PlanComparison`: one feature and what each plan gets. */
export interface PlanComparisonRow {
  label: ReactNode;
  hint?: string;
  /** Keyed by plan id. `true` is a check, `false` or missing a dash, anything else is shown as is ("10 GB"). */
  values: Record<string, boolean | ReactNode>;
}

export interface PlanComparisonSection {
  /** A group heading: "Projects", "Security". */
  title?: ReactNode;
  rows: PlanComparisonRow[];
}

export interface PlanComparisonProps extends Omit<ComponentProps<"div">, "onSelect"> {
  plans: PricingPlan[];
  sections: PlanComparisonSection[];
  currency?: string;
  period?: BillingPeriod;
  currentPlanId?: string;
  /** Adds each plan's button to the sticky header, so people can subscribe from the row they are reading. */
  onSelect?: (plan: PricingPlan, period: BillingPeriod) => void | Promise<unknown>;
  /** The table's accessible name. */
  caption?: ReactNode;
  labels?: Partial<PricingLabels>;
}

/** Every feature, plan by plan. The header with the plan names, prices and buttons stays on screen while you scroll. */
export function PlanComparison({ plans, sections, currency: currencyProp, period = "month", currentPlanId, onSelect, caption, labels, className, ...props }: PlanComparisonProps) {
  const currency = useCurrency(currencyProp);
  const { t } = usePricingLabels(labels);
  const cell = (value: boolean | ReactNode) => {
    if (value === true) {
      return (
        <>
          <Check aria-hidden className="mx-auto size-4 text-nq-brand" />
          <span className="sr-only">{t.included}</span>
        </>
      );
    }
    if (value === false || value === undefined || value === null) {
      return (
        <>
          <Minus aria-hidden className="mx-auto size-4 text-muted-foreground/60" />
          <span className="sr-only">{t.notIncluded}</span>
        </>
      );
    }
    return <span className="text-body-sm text-foreground">{value}</span>;
  };
  return (
    <div data-slot="plan-comparison" className={cn("w-full overflow-x-auto", className)} {...props}>
      <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-start">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="sticky top-0 z-1 bg-background">
          <tr>
            <th scope="col" className="w-[28%] border-b border-border p-3 text-start align-bottom text-label text-muted-foreground">
              {t.feature}
            </th>
            {plans.map((plan) => {
              const action = planAction(plan, plans, t, currentPlanId);
              return (
                <th
                  key={plan.id}
                  scope="col"
                  data-highlighted={plan.highlighted || undefined}
                  className={cn("border-b border-border p-3 text-center align-bottom font-normal", plan.highlighted && "bg-[color-mix(in_oklab,var(--nq-brand)_7%,transparent)]")}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-h4 text-foreground">{plan.name}</span>
                    <PlanPrice plan={plan} period={period} currency={currency} size="sm" />
                    {onSelect ? (
                      <Button size="sm" variant={action.variant} disabled={action.disabled} onClick={() => onSelect(plan, period)} className="h-auto min-h-8 w-full max-w-44 whitespace-normal py-1 leading-tight text-balance">
                        {action.label}
                      </Button>
                    ) : null}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sections.map((section, s) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static copy
            <Fragment key={s}>
              {section.title ? (
                <tr>
                  <th scope="colgroup" colSpan={plans.length + 1} className="px-3 pt-6 pb-2 text-start text-label text-foreground">
                    {section.title}
                  </th>
                </tr>
              ) : null}
              {section.rows.map((row, r) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static copy
                <tr key={r} className="hover:bg-nq-hover/50">
                  <th scope="row" className="border-b border-border px-3 py-2.5 text-start text-body-sm font-normal text-foreground">
                    {row.hint ? (
                      <Tooltip content={row.hint}>
                        <span tabIndex={0} className="cursor-help underline decoration-nq-line decoration-dotted underline-offset-4">
                          {row.label}
                        </span>
                      </Tooltip>
                    ) : (
                      row.label
                    )}
                  </th>
                  {plans.map((plan) => (
                    <td key={plan.id} className={cn("border-b border-border px-3 py-2.5 text-center", plan.highlighted && "bg-[color-mix(in_oklab,var(--nq-brand)_7%,transparent)]")}>
                      {cell(row.values[plan.id])}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface PlanPickerProps extends Omit<ComponentProps<typeof RadioGroup>, "value" | "defaultValue" | "onValueChange"> {
  plans: PricingPlan[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (planId: string) => void;
  currency?: string;
  period?: BillingPeriod;
  /** The account's plan: shown, but not selectable. */
  currentPlanId?: string;
  labels?: Partial<PricingLabels>;
}

/** Plans as a compact list of radio cards, for an upgrade dialog, checkout or onboarding, where full cards do not fit. */
export function PlanPicker({ plans, value, defaultValue, onValueChange, currency: currencyProp, period = "month", currentPlanId, labels, className, ...props }: PlanPickerProps) {
  const currency = useCurrency(currencyProp);
  const { t } = usePricingLabels(labels);
  return (
    <RadioGroup
      data-slot="plan-picker"
      value={value}
      defaultValue={defaultValue}
      onValueChange={(v) => onValueChange?.(v as string)}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {plans.map((plan) => (
        <RadioCard
          key={plan.id}
          value={plan.id}
          disabled={plan.id === currentPlanId}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {plan.name}
              {plan.id === currentPlanId ? (
                <Badge variant="outline" className="h-5 px-1.5">
                  {t.current}
                </Badge>
              ) : plan.badge ? (
                <Badge variant="brand" className="h-5 px-1.5">
                  {plan.badge}
                </Badge>
              ) : null}
            </span>
          }
          description={plan.description}
          meta={<PlanPrice plan={plan} period={period} currency={currency} size="sm" />}
        />
      ))}
    </RadioGroup>
  );
}
