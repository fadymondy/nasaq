"use client";

import { Minus, Plus, Sparkles } from "lucide-react";
import { type ReactNode, useId, useMemo, useState } from "react";
import type { CommerceProduct } from "../../lib/commerce";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { CurrencyInput } from "../currency-input";
import { Field, FieldLabel, Input } from "../field";
import { type Discount, type DiscountLine, evaluateDiscounts, normalizeDiscountCode } from "./discount-logic";
import { Money, type StoreSettingsLabels, useSettingsStrings } from "./store-settings-shared";

export interface SimCollection {
  id: string;
  title: string;
  productIds: readonly string[];
}

/**
 * Runs `evaluateDiscounts` on a sample basket, so a merchant sees which discounts apply, what each takes off, and why
 * the others do not. Codes are typed like a customer would. The same function can run on your server at checkout.
 */
export function DiscountSimulator({ discounts, products, collections = [], currency, now, labels }: { discounts: readonly Discount[]; products: readonly CommerceProduct[]; collections?: readonly SimCollection[]; currency: string; now: Date; labels?: StoreSettingsLabels }) {
  const { t, n } = useSettingsStrings(labels);
  const id = useId();
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(products.slice(0, 2).map((p, i) => [p.id, i + 1])));
  const [shipping, setShipping] = useState(5000);
  const [codes, setCodes] = useState("");
  const [orders, setOrders] = useState("0");

  const lines: DiscountLine[] = useMemo(
    () =>
      products
        .filter((p) => (qty[p.id] ?? 0) > 0 && p.variants[0])
        .map((p) => {
          const v = p.variants[0];
          return { id: p.id, productId: p.id, collectionIds: collections.filter((c) => c.productIds.includes(p.id)).map((c) => c.id), unitPrice: v?.price ?? 0, quantity: qty[p.id] ?? 0, ...(v?.compareAt !== undefined ? { compareAt: v.compareAt } : {}) };
        }),
    [products, qty, collections],
  );
  const codeList = codes.split(/[\s,]+/).map(normalizeDiscountCode).filter(Boolean);
  const result = useMemo(() => evaluateDiscounts(discounts, { lines, shipping, codes: codeList, now, customer: { ordersCount: Number(orders) || 0 } }), [discounts, lines, shipping, codeList.join("|"), now, orders]);
  const totalPay = result.goodsAfter + result.shippingAfter;

  return (
    <Card className="w-full" data-slot="discount-simulator">
      <CardHeader>
        <CardTitle as="h3" className="flex items-center gap-2">
          <Sparkles aria-hidden className="size-4 text-muted-foreground" />
          {t.simulator}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-body-sm text-muted-foreground">{t.simulatorHint}</p>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-3">
            <ul className="grid gap-1.5" aria-label={t.basket}>
              {products.slice(0, 8).map((p) => (
                <li key={p.id} className="flex min-w-0 items-center justify-between gap-2 rounded-control border border-border px-2.5 py-1.5 text-body-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{p.name}</span>
                    <span className="text-caption text-muted-foreground">
                      <Money minor={p.variants[0]?.price ?? 0} currency={currency} />
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button type="button" size="icon-sm" variant="ghost" aria-label={`${t.decrease}: ${p.name}`} disabled={(qty[p.id] ?? 0) === 0} onClick={() => setQty((q) => ({ ...q, [p.id]: Math.max(0, (q[p.id] ?? 0) - 1) }))}>
                      <Minus aria-hidden />
                    </Button>
                    <span className="w-6 text-center tabular-nums" aria-live="polite">
                      {n(qty[p.id] ?? 0)}
                    </span>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label={`${t.increase}: ${p.name}`} onClick={() => setQty((q) => ({ ...q, [p.id]: (q[p.id] ?? 0) + 1 }))}>
                      <Plus aria-hidden />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel>{t.shippingCharge}</FieldLabel>
                <CurrencyInput currency={currency} value={shipping} onValueChange={(v) => setShipping(v ?? 0)} aria-label={t.shippingCharge} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-codes`}>{t.codesTyped}</FieldLabel>
                <Input id={`${id}-codes`} ltr className="uppercase" value={codes} placeholder="SUMMER10" onChange={(e) => setCodes(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-orders`}>{t.pastOrders}</FieldLabel>
                <Input id={`${id}-orders`} ltr inputMode="numeric" value={orders} onChange={(e) => setOrders(e.target.value.replace(/\D/g, ""))} />
              </Field>
            </div>
          </div>

          <div role="status" aria-live="polite" className="grid content-start gap-3 rounded-card border border-border bg-nq-surface-soft p-3 text-body-sm">
            {lines.length === 0 ? (
              <p className="text-muted-foreground">{t.basketEmpty}</p>
            ) : (
              <>
                <dl className="grid gap-1">
                  <Row label={t.subtotal} value={<Money minor={result.subtotal} currency={currency} />} />
                  {result.applied.map((a) => (
                    <Row
                      key={a.id}
                      label={
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{a.title}</span>
                          {a.capped ? <Badge variant="warning">{t.capped}</Badge> : null}
                          {a.freeUnits !== undefined ? <Badge variant="info">{t.freeUnits(n(a.freeUnits))}</Badge> : null}
                        </span>
                      }
                      value={<span className="text-nq-success-text">−<Money minor={a.amount} currency={currency} /></span>}
                    />
                  ))}
                  <Row label={t.shippingCharge} value={result.shippingDiscount > 0 ? <span><s className="text-muted-foreground"><Money minor={shipping} currency={currency} /></s> <Money minor={result.shippingAfter} currency={currency} /></span> : <Money minor={shipping} currency={currency} />} />
                  <div className="mt-1 border-t border-border pt-1.5">
                    <Row label={<span className="font-semibold text-foreground">{t.customerPays}</span>} value={<span className="font-semibold text-foreground"><Money minor={totalPay} currency={currency} /></span>} />
                  </div>
                </dl>
                {result.applied.length === 0 ? <p className="text-muted-foreground">{t.nothingApplies}</p> : null}
                {result.rejected.length > 0 ? (
                  <div className="grid gap-1 border-t border-border pt-2">
                    <p className="text-caption font-medium text-muted-foreground">{t.notApplied}</p>
                    <ul className="grid gap-0.5 text-caption text-muted-foreground">
                      {result.rejected.map((r) => (
                        <li key={r.id}>
                          <span className="font-medium text-foreground">{r.title}</span>: {t.rejections[r.reason]}
                          {r.with ? ` (${discounts.find((d) => d.id === r.with)?.title ?? r.with})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <dt className="min-w-0 text-muted-foreground">{label}</dt>
      <dd className="shrink-0 text-foreground">{value}</dd>
    </div>
  );
}
