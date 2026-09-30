"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceAddress, CommerceOrder } from "../../lib/commerce";
import { Barcode } from "../barcode";
import { Button } from "../button";
import { DateTime, Num } from "../numeric";
import { ToggleGroup, Toggle } from "../toggle-group";
import { useStoreAdminStrings, type StoreAdminLabels } from "./admin-strings";
import { StoreMoney } from "./money";
import { lineFulfilled, lineOutstanding, lineRefunded, paymentSummary, type RefundRecord } from "./order-math";
import type { StoreOrderDocumentKind } from "./store-orders-list";

export interface StoreDocumentSeller {
  name: string;
  /** Address lines, top to bottom. */
  lines?: string[];
  email?: string;
  phone?: string;
  /** Tax registration number, printed on invoices. */
  taxId?: string;
  logo?: string;
}

/**
 * Print rules for the documents. Everything outside `.nq-print-root` is hidden, the sheet loses its frame, each order
 * starts a new page and the layout uses logical properties so Arabic sheets print right to left.
 */
export const STORE_DOCUMENT_PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: white !important; }
  body * { visibility: hidden !important; }
  .nq-print-root, .nq-print-root * { visibility: visible !important; }
  .nq-print-root { position: absolute; inset-block-start: 0; inset-inline-start: 0; width: 100%; margin: 0 !important; padding: 0 !important; }
  .nq-print-hide { display: none !important; }
  .nq-print-sheet { border: 0 !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; margin: 0 !important; color: black !important; background: white !important; break-after: page; page-break-after: always; }
  .nq-print-sheet:last-child { break-after: auto; page-break-after: auto; }
  .nq-print-sheet * { color: black !important; border-color: black !important; }
  .nq-print-sheet tr, .nq-print-sheet li { break-inside: avoid; }
}
`;

function Address({ title, address }: { title: string; address?: CommerceAddress }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-body-sm">
      <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {address ? (
        <address className="flex flex-col not-italic text-foreground">
          <span className="font-medium">{address.name}</span>
          <span>{address.line1}</span>
          {address.line2 ? <span>{address.line2}</span> : null}
          <span>{[address.region, address.city].filter(Boolean).join(", ")}</span>
          {address.postalCode ? <bdi dir="ltr" className="text-start">{address.postalCode}</bdi> : null}
          {address.phone ? <bdi dir="ltr" className="text-start">{address.phone}</bdi> : null}
        </address>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </div>
  );
}

export interface StoreOrderDocumentProps {
  kind: StoreOrderDocumentKind;
  order: CommerceOrder;
  currency: string;
  seller: StoreDocumentSeller;
  refunds?: readonly RefundRecord[];
  /** Printed under the totals, for example return terms. */
  footer?: string;
  labels?: StoreAdminLabels;
  className?: string;
}

/**
 * One printable sheet: an invoice (prices, totals, refunds, tax number) or a packing slip (what to put in the box, no
 * prices). The order number is also a barcode so it can be scanned at the packing bench.
 */
export function StoreOrderDocument({ kind, order, currency, seller, refunds = [], footer, labels, className }: StoreOrderDocumentProps) {
  const { t } = useStoreAdminStrings(labels);
  const invoice = kind === "invoice";
  const summary = paymentSummary(order, refunds);
  const rows = order.lines.filter((l) => invoice || lineOutstanding(l) + lineFulfilled(l) > 0);
  return (
    <article
      data-slot="store-order-document"
      data-kind={kind}
      aria-label={`${invoice ? t.invoice : t.packingSlip} ${order.number}`}
      className={cn("nq-print-sheet mx-auto flex w-full max-w-[52rem] flex-col gap-6 rounded-card border border-border bg-card p-8 text-foreground", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {seller.logo ? <img src={seller.logo} alt="" className="mb-1 h-10 w-auto self-start" /> : null}
          <span className="text-h3 font-semibold">{seller.name}</span>
          {seller.lines?.map((line) => (
            <span key={line} className="text-body-sm text-muted-foreground">
              {line}
            </span>
          ))}
          {seller.email ? <span dir="ltr" className="text-start text-body-sm text-muted-foreground">{seller.email}</span> : null}
          {seller.phone ? <span dir="ltr" className="text-start text-body-sm text-muted-foreground">{seller.phone}</span> : null}
          {invoice && seller.taxId ? (
            <span className="text-body-sm text-muted-foreground">
              {t.taxId}: <bdi dir="ltr">{seller.taxId}</bdi>
            </span>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 text-end">
          <h2 className="text-h2 font-semibold">{invoice ? t.invoice : t.packingSlip}</h2>
          <span className="text-body-sm">
            {t.order} <bdi>{order.number}</bdi>
          </span>
          <span className="text-body-sm text-muted-foreground">
            <DateTime value={order.placedAt} format={{ dateStyle: "long" }} />
          </span>
          <Barcode value={order.number.replace("#", "")} height={36} barWidth={1.5} margin={0} showValue={false} aria-label={`${t.order} ${order.number}`} />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Address title={t.shipTo} address={order.shippingAddress} />
        {invoice ? <Address title={t.billTo} address={order.billingAddress ?? order.shippingAddress} /> : (
          <div className="flex flex-col gap-0.5 text-body-sm">
            <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{t.shipment}</h3>
            <span>{order.shippingMethod?.label ?? "-"}</span>
            {order.tracking ? <bdi dir="ltr" className="text-start">{order.tracking.carrier} {order.tracking.number}</bdi> : null}
          </div>
        )}
      </div>

      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-border text-start text-caption uppercase tracking-wide text-muted-foreground">
            {!invoice ? <th scope="col" className="w-8 py-2 text-start font-medium"><span className="sr-only">{t.packed}</span></th> : null}
            <th scope="col" className="py-2 text-start font-medium">{t.item}</th>
            <th scope="col" className="py-2 text-end font-medium">{invoice ? t.quantity : t.toPack}</th>
            {invoice ? (
              <>
                <th scope="col" className="py-2 text-end font-medium">{t.unitPrice}</th>
                <th scope="col" className="py-2 text-end font-medium">{t.total}</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((line) => {
            const refunded = lineRefunded(line);
            const qty = invoice ? line.quantity - refunded : lineOutstanding(line) + lineFulfilled(line);
            return (
              <tr key={line.id} className="border-b border-border align-top">
                {!invoice ? (
                  <td className="py-2">
                    <span aria-hidden className="inline-block size-4 rounded-sm border border-border" />
                  </td>
                ) : null}
                <td className="py-2 pe-2">
                  <span className="font-medium">{line.name}</span>
                  {line.variantLabel ? <span className="block text-caption text-muted-foreground">{line.variantLabel}</span> : null}
                  {line.variantId ? <span dir="ltr" className="block text-start text-caption text-muted-foreground">{line.variantId}</span> : null}
                </td>
                <td className="py-2 text-end"><Num value={invoice ? line.quantity : qty} /></td>
                {invoice ? (
                  <>
                    <td className="py-2 text-end"><StoreMoney amount={line.unitPrice} currency={currency} /></td>
                    <td className="py-2 text-end"><StoreMoney amount={line.unitPrice * line.quantity} currency={currency} /></td>
                  </>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>

      {invoice ? (
        <dl className="m-0 ms-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-body-sm">
          <dt className="text-muted-foreground">{t.subtotal}</dt>
          <dd className="m-0 text-end"><StoreMoney amount={order.totals.subtotal} currency={currency} /></dd>
          {order.totals.discount > 0 ? (
            <>
              <dt className="text-muted-foreground">{t.discount}</dt>
              <dd className="m-0 text-end"><StoreMoney amount={order.totals.discount} currency={currency} negative /></dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{t.shipping}</dt>
          <dd className="m-0 text-end">{order.totals.shipping > 0 ? <StoreMoney amount={order.totals.shipping} currency={currency} /> : t.free}</dd>
          {order.totals.tax > 0 ? (
            <>
              <dt className="text-muted-foreground">{t.tax}</dt>
              <dd className="m-0 text-end"><StoreMoney amount={order.totals.tax} currency={currency} /></dd>
            </>
          ) : null}
          <dt className="border-t border-border pt-1 font-semibold">{t.total}</dt>
          <dd className="m-0 border-t border-border pt-1 text-end font-semibold"><StoreMoney amount={summary.total} currency={currency} /></dd>
          {summary.refunded > 0 ? (
            <>
              <dt className="text-muted-foreground">{t.refunded}</dt>
              <dd className="m-0 text-end"><StoreMoney amount={summary.refunded} currency={currency} negative /></dd>
              <dt className="font-semibold">{t.netPaid}</dt>
              <dd className="m-0 text-end font-semibold"><StoreMoney amount={summary.net} currency={currency} /></dd>
            </>
          ) : null}
          {summary.due > 0 ? (
            <>
              <dt className="font-semibold">{t.due}</dt>
              <dd className="m-0 text-end font-semibold"><StoreMoney amount={summary.due} currency={currency} /></dd>
            </>
          ) : null}
        </dl>
      ) : (
        <p className="text-body-sm text-muted-foreground">
          {t.slipNote}
        </p>
      )}
      {footer ? <p className="border-t border-border pt-3 text-caption text-muted-foreground">{footer}</p> : null}
    </article>
  );
}

export interface StoreOrderPrintViewProps {
  orders: readonly CommerceOrder[];
  kind?: StoreOrderDocumentKind;
  currency: string;
  seller: StoreDocumentSeller;
  refunds?: (order: CommerceOrder) => readonly RefundRecord[];
  footer?: string;
  onClose?: () => void;
  labels?: StoreAdminLabels;
  className?: string;
}

/**
 * A preview of one or many documents with a Print button. The print CSS hides this toolbar and everything else on the
 * page, and starts each order on its own page.
 */
export function StoreOrderPrintView({ orders, kind: initial = "invoice", currency, seller, refunds, footer, onClose, labels, className }: StoreOrderPrintViewProps) {
  const { t } = useStoreAdminStrings(labels);
  const [kind, setKind] = useState<StoreOrderDocumentKind>(initial);
  return (
    <div data-slot="store-order-print-view" className={cn("flex min-w-0 flex-col gap-4", className)}>
      <style>{STORE_DOCUMENT_PRINT_CSS}</style>
      <div className="nq-print-hide flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onClose ? (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
              {t.back}
            </Button>
          ) : null}
          <ToggleGroup aria-label={t.document} value={[kind]} onValueChange={(v) => v[0] && setKind(v[0] as StoreOrderDocumentKind)}>
            <Toggle value="invoice">{t.invoice}</Toggle>
            <Toggle value="packing-slip">{t.packingSlip}</Toggle>
          </ToggleGroup>
          <span className="text-body-sm text-muted-foreground">{t.documentsCount(orders.length)}</span>
        </div>
        <Button variant="primary" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden />
          {t.print}
        </Button>
      </div>
      <div className="nq-print-root flex flex-col gap-6">
        {orders.map((order) => (
          <StoreOrderDocument key={order.id} kind={kind} order={order} currency={currency} seller={seller} refunds={refunds?.(order)} footer={footer} labels={labels} />
        ))}
      </div>
    </div>
  );
}
