"use client";

import { Banknote, Check, CircleAlert, Undo2 } from "lucide-react";
import { type ComponentProps, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { DELIVERY_DEFAULT_CURRENCY, cashBreakdown, deliveryMoney, deliveryMinorFactor } from "../../lib/delivery";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { CurrencyInput } from "../currency-input";

const STRINGS = {
  en: {
    title: "Cash on delivery",
    orderTotal: "Order total",
    deliveryFee: "Delivery fee",
    prepaid: "Paid online",
    due: "Amount due",
    collected: "Cash received",
    exact: "Exact amount",
    shortBy: "Still owed",
    change: "Change to return",
    unpaid: "Nothing received yet",
    prepaidAll: "Paid in full online. Collect nothing.",
    confirm: "Confirm cash collected",
    shortHelp: "The amount is less than what is due.",
  },
  ar: {
    title: "الدفع عند الاستلام",
    orderTotal: "إجمالي الطلب",
    deliveryFee: "رسوم التوصيل",
    prepaid: "مدفوع إلكترونيًا",
    due: "المبلغ المستحق",
    collected: "النقد المستلم",
    exact: "المبلغ مطابق",
    shortBy: "المتبقي",
    change: "الباقي للعميل",
    unpaid: "لم يُستلم شيء بعد",
    prepaidAll: "مدفوع بالكامل إلكترونيًا. لا تحصّل شيئًا.",
    confirm: "تأكيد تحصيل النقد",
    shortHelp: "المبلغ أقل من المستحق.",
  },
};
export type CashCollectLabels = Partial<(typeof STRINGS)["en"]>;

export { cashBreakdown };

export interface CashCollectProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  /** Order total in minor units (cents, agorot). */
  orderTotalMinor: number;
  /** Delivery fee in minor units. Cash on delivery collects total plus fee. */
  deliveryFeeMinor: number;
  /** Already paid online, taken off the amount due. */
  prepaidMinor?: number;
  currency?: string;
  /** Cash received, in minor units. Controlled when set. */
  collectedMinor?: number | null;
  defaultCollectedMinor?: number | null;
  onCollectedChange?: (minor: number | null) => void;
  /** Called with the amount received when Confirm is pressed. */
  onConfirm?: (collectedMinor: number) => void;
  /** Allow confirming less than what is due (a partial payment). Default false. */
  allowShort?: boolean;
  /** Quick-pick buttons in minor units. Defaults to the exact amount and the next round notes. */
  quickAmounts?: readonly number[];
  loading?: boolean;
  locale?: string;
  labels?: CashCollectLabels;
}

/** Round-note suggestions above `due`: the exact amount, then the next 10, 50 and 100 of the major unit. */
function suggestions(due: number, currency: string): number[] {
  const f = deliveryMinorFactor(currency);
  const set = new Set<number>([due]);
  for (const step of [10, 50, 100]) {
    const up = Math.ceil(due / (step * f)) * step * f;
    if (up > due) set.add(up);
  }
  return [...set].filter((v) => v > 0).slice(0, 4);
}

/**
 * The cash-on-delivery sheet for a courier: order total plus delivery fee (minus anything paid online) as the amount
 * due, an amount received field in minor units, and a plain statement of what is short or what change to hand back.
 * Nothing is conveyed by colour alone: the state is a sentence with an icon.
 */
export function CashCollect({
  orderTotalMinor,
  deliveryFeeMinor,
  prepaidMinor = 0,
  currency = DELIVERY_DEFAULT_CURRENCY,
  collectedMinor: collectedProp,
  defaultCollectedMinor = null,
  onCollectedChange,
  onConfirm,
  allowShort = false,
  quickAmounts,
  loading,
  locale: localeProp,
  labels,
  className,
  ...props
}: CashCollectProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const uid = useId();
  const [inner, setInner] = useState<number | null>(defaultCollectedMinor);
  const collected = collectedProp !== undefined ? collectedProp : inner;
  const b = cashBreakdown({ orderTotal: orderTotalMinor, deliveryFee: deliveryFeeMinor, prepaid: prepaidMinor, collected });
  const money = (v: number) => deliveryMoney(v, currency, locale);
  const fullyPrepaid = b.due === 0;
  const canConfirm = fullyPrepaid || (b.collected > 0 && (allowShort || b.collected >= b.due));
  const quick = quickAmounts ?? suggestions(b.due, currency);

  const set = (next: number | null) => {
    if (collectedProp === undefined) setInner(next);
    onCollectedChange?.(next);
  };

  const row = (label: string, value: number, strong = false, negative = false) => (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn(strong ? "text-label text-foreground" : "text-body-sm text-muted-foreground")}>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "text-h3 text-foreground" : "text-body-sm text-foreground")}>
        <bdi>
          {negative ? "−" : ""}
          {money(value)}
        </bdi>
      </dd>
    </div>
  );

  const statusText = b.state === "over" ? `${t.change}: ` : b.state === "short" ? `${t.shortBy}: ` : b.state === "exact" && b.collected > 0 ? t.exact : t.unpaid;
  const statusAmount = b.state === "over" ? b.change : b.state === "short" ? b.shortBy : null;
  const StatusIcon = b.state === "over" ? Undo2 : b.state === "short" ? CircleAlert : b.state === "exact" && b.collected > 0 ? Check : Banknote;

  return (
    <section data-slot="cash-collect" data-state={b.state} aria-labelledby={`${uid}-title`} className={cn("flex flex-col gap-4 rounded-card border border-border bg-card p-4 sm:p-5", className)} {...props}>
      <h2 id={`${uid}-title`} className="text-h3 text-foreground">
        {t.title}
      </h2>

      <dl data-slot="cash-breakdown" className="flex flex-col gap-2">
        {row(t.orderTotal, orderTotalMinor)}
        {row(t.deliveryFee, deliveryFeeMinor)}
        {prepaidMinor > 0 ? row(t.prepaid, prepaidMinor, false, true) : null}
        <div className="border-t border-border pt-2">{row(t.due, b.due, true)}</div>
      </dl>

      {fullyPrepaid ? (
        <p role="status" className="flex items-center gap-2 rounded-control border border-nq-success/40 bg-nq-success-soft px-3 py-2 text-body-sm text-nq-success-text">
          <Check aria-hidden className="size-4 shrink-0" />
          {t.prepaidAll}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${uid}-input`} className="text-label text-foreground">
              {t.collected}
            </label>
            <CurrencyInput id={`${uid}-input`} value={collected} onValueChange={set} currency={currency} locale={locale} min={0} />
            {quick.length ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label={t.collected}>
                {quick.map((amount) => (
                  <Button key={amount} type="button" size="sm" variant={collected === amount ? "primary" : "secondary"} aria-pressed={collected === amount} onClick={() => set(amount)}>
                    <bdi className="tabular-nums">{money(amount)}</bdi>
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          <p
            role="status"
            data-slot="cash-status"
            className={cn(
              "flex items-center gap-2 rounded-control border px-3 py-2 text-body-sm",
              b.state === "short" && "border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text",
              b.state === "over" && "border-nq-info/40 bg-nq-info-soft text-nq-info-text",
              b.state === "exact" && b.collected > 0 && "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
              (b.state === "unpaid" || (b.state === "exact" && b.collected === 0)) && "border-border bg-secondary text-muted-foreground",
            )}
          >
            <StatusIcon aria-hidden className="size-4 shrink-0" />
            <span>
              {statusText}
              {statusAmount !== null ? <bdi className="font-medium tabular-nums">{money(statusAmount)}</bdi> : null}
            </span>
            {b.state === "short" && !allowShort ? <span className="sr-only">{t.shortHelp}</span> : null}
          </p>
        </>
      )}

      <Button type="button" variant="primary" size="lg" disabled={!canConfirm} loading={loading} onClick={() => onConfirm?.(fullyPrepaid ? 0 : b.collected)}>
        <Check aria-hidden />
        {t.confirm}
      </Button>
    </section>
  );
}
