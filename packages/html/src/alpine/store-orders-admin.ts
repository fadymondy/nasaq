// nqStoreOrdersList / nqStoreOrderDetail / nqStoreAbandonedCarts / nqStoreOrderPrintView: the store admin of the Blade
// store-orders-admin components. The markup is the React StoreOrdersAdmin's; the state lives here and the maths comes
// from store-orders-admin-logic.ts (the same pure code as the React kit).
//
//   <div data-slot="store-orders-list" x-data="nqStoreOrdersList(config)"> … </div>
//   <div data-slot="store-order-detail" x-data="nqStoreOrderDetail(config)"> … </div>
//   <section data-slot="store-abandoned-carts" x-data="nqStoreAbandonedCarts(config)"> … </section>
//   <div data-slot="store-order-print-view" x-data="nqStoreOrderPrintView(config)"> … </div>
//
// Money is integer minor units; `config.currency` is the ISO code (USD, or SAR in Arabic) and `config.t` the strings.
// Events (bubbling, from the root):
//   "nq-open-order"      { order }                                      a row was opened
//   "nq-mark-fulfilled"  { orders }          cancelable                 not cancelled: the orders are shipped in full locally
//   "nq-print"           { orders, document }                           "invoice" | "packing-slip"
//   "nq-export"          { orders, csv }     cancelable                 not cancelled: orders.csv is downloaded
//   "nq-views-change"    { views }                                      the saved views changed
//   "nq-order-change"    { order, refunds, restock? }                   a shipment, refund, cancel or note was applied
//   "nq-back"            {}                                             the back button of the detail
//   "nq-send-recovery"   { cartId, discountPercent, discountAmount, message }   cancelable; not cancelled: the cart is marked emailed

import {
  type AbandonedCart,
  type CommerceOrder,
  type OrderFilters,
  type OrderView,
  type RecoveryRules,
  type RefundRecord,
  activeView,
  applyCancel,
  applyFulfilment,
  applyNote,
  applyRefund,
  canCancel,
  canMarkFulfilled,
  canRefund,
  canSendRecovery,
  cartIdleMinutes,
  cartItemCount,
  cartValue,
  commerceMinorFactor,
  filterOrders,
  fulfilmentProgress,
  lineFulfilled,
  lineOutstanding,
  lineRefundable,
  lineRefunded,
  orderFulfilment,
  ordersToCsv,
  paymentSummary,
  planCancel,
  planFulfilment,
  planRefund,
  recoveryDiscount,
  recoveryStats,
  recoveryStatus,
  refundRemaining,
  removeView,
  shippingRefunded,
  upsertView,
  viewCounts,
} from "./store-orders-admin-logic";
import type { Register } from "./types";

type Chip = { label: string; variant: string };
interface Labels {
  status: Record<string, Chip>;
  payment: Record<string, Chip>;
  fulfilment: Record<string, Chip>;
}
interface Base {
  locale?: string;
  currency: string;
  t: Record<string, string>;
  labels?: Labels;
}

const CHIP: Record<string, string> = {
  neutral: "border-border bg-secondary text-foreground",
  success: "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
  warning: "border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text",
  danger: "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text",
  info: "border-nq-info/40 bg-nq-info-soft text-nq-info-text",
};
const FACETS = ["status", "payment", "fulfilment"] as const;
let counter = 0;

/** Formatting and string helpers every component of the module shares. Methods only, so they spread safely. */
function helpers(config: Base) {
  const tag = new Intl.Locale(config.locale ?? "en", { numberingSystem: "latn" }).toString();
  const factor = commerceMinorFactor(config.currency);
  const digits = Math.round(Math.log10(factor));
  const money = new Intl.NumberFormat(tag, { style: "currency", currency: config.currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
  const numbers = new Intl.NumberFormat(tag, { maximumFractionDigits: 3 });
  return {
    t: config.t,
    currency: config.currency,
    factor,
    labels: (config.labels ?? { status: {}, payment: {}, fulfilment: {} }) as Labels,
    tt(key: string, vars: Record<string, string | number> = {}): string {
      return (config.t[key] ?? key).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
    },
    money(minor: number, negative = false): string {
      return money.format((negative ? -Math.abs(minor) : minor) / factor);
    },
    num(n: number): string {
      return numbers.format(n);
    },
    date(iso: string | undefined, style: "medium" | "long" = "medium", time = false): string {
      if (!iso) return "";
      const opts: Intl.DateTimeFormatOptions = time ? { dateStyle: style, timeStyle: "short", timeZone: "UTC" } : { dateStyle: style, timeZone: "UTC" };
      return new Intl.DateTimeFormat(tag, opts).format(new Date(iso));
    },
    chipClass(variant: string): string {
      return CHIP[variant] ?? CHIP.neutral!;
    },
    statusChip(status: string): Chip {
      return (config.labels?.status ?? {})[status] ?? { label: status, variant: "neutral" };
    },
    paymentChip(payment: string): Chip {
      return (config.labels?.payment ?? {})[payment] ?? { label: payment, variant: "neutral" };
    },
    fulfilmentChip(order: CommerceOrder): Chip {
      const key = orderFulfilment(order);
      return (config.labels?.fulfilment ?? {})[key] ?? { label: key, variant: "neutral" };
    },
  };
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

interface ListConfig extends Base {
  orders: CommerceOrder[];
  views?: OrderView[];
  pageSize?: number;
  builtIn: OrderView[];
  now?: string;
  loading?: boolean;
  error?: boolean;
}

interface DetailConfig extends Base {
  order: CommerceOrder;
  refunds?: RefundRecord[];
  actor?: string;
  carriers?: string[];
  trackingTemplate?: string | null;
  canBack?: boolean;
  now?: string;
}

interface CartsConfig extends Base {
  carts: AbandonedCart[];
  now: number;
  rules?: RecoveryRules;
  maxDiscountPercent?: number;
  loading?: boolean;
  error?: boolean;
  canSend?: boolean;
}

export const storeOrdersAdmin: Register = (Alpine) => {
  /* ------------------------------------------------------------------ orders list */
  Alpine.data("nqStoreOrdersList", (config: ListConfig) => ({
    ...helpers(config),
    orders: [...config.orders] as CommerceOrder[],
    builtIn: config.builtIn,
    saved: [...(config.views ?? [])] as OrderView[],
    pageSize: config.pageSize ?? 10,
    loading: Boolean(config.loading),
    error: Boolean(config.error),
    query: "",
    facet: { status: {}, payment: {}, fulfilment: {} } as Record<string, Record<string, boolean>>,
    sel: {} as Record<string, boolean>,
    sortKey: "date",
    sortDir: "desc" as "asc" | "desc",
    page: 1,
    saving: false,
    viewName: "",

    get filters(): OrderFilters {
      const out: OrderFilters = {};
      for (const f of FACETS) {
        const on = Object.keys(this.facet[f] ?? {}).filter((k) => this.facet[f][k]);
        if (on.length) out[f] = on;
      }
      return out;
    },
    get allViews(): OrderView[] {
      return [...this.builtIn, ...this.saved];
    },
    get counts(): Record<string, number> {
      return viewCounts(this.orders, this.allViews);
    },
    get current(): OrderView | undefined {
      return activeView(this.allViews, { filters: this.filters, query: this.query });
    },
    get filtered(): CommerceOrder[] {
      return filterOrders(this.orders, { filters: this.filters, query: this.query });
    },
    get isFiltered(): boolean {
      return !!this.query.trim() || Object.keys(this.filters).length > 0;
    },
    get sorted(): CommerceOrder[] {
      const key: Record<string, (o: CommerceOrder) => string | number> = {
        number: (o) => o.number,
        date: (o) => o.placedAt,
        customer: (o) => o.customer.name,
        items: (o) => o.totals.itemCount,
        total: (o) => o.totals.total,
      };
      const by = key[this.sortKey] ?? key.date!;
      const dir = this.sortDir === "asc" ? 1 : -1;
      return [...this.filtered].sort((a, b) => {
        const x = by(a);
        const y = by(b);
        return (x < y ? -1 : x > y ? 1 : 0) * dir;
      });
    },
    get pages(): number {
      return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    },
    get rows(): CommerceOrder[] {
      const p = Math.min(this.page, this.pages);
      return this.sorted.slice((p - 1) * this.pageSize, p * this.pageSize);
    },
    get selected(): CommerceOrder[] {
      return this.orders.filter((o: CommerceOrder) => this.sel[o.id]);
    },
    get eligible(): CommerceOrder[] {
      return this.selected.filter(canMarkFulfilled);
    },
    get allOnPage(): boolean {
      return this.rows.length > 0 && this.rows.every((o: CommerceOrder) => this.sel[o.id]);
    },
    get markLabel(): string {
      const n = this.eligible.length;
      return n === 1 ? this.t.markFulfilledOne : this.tt("markFulfilled", { n });
    },
    get skippedHint(): string | null {
      const n = this.selected.length - this.eligible.length;
      return n > 0 ? this.tt("someSkipped", { n }) : null;
    },
    isSaved(id: string): boolean {
      return this.saved.some((v: OrderView) => v.id === id);
    },
    canFulfil(o: CommerceOrder): boolean {
      return canMarkFulfilled(o);
    },
    pick(view: OrderView) {
      for (const f of FACETS) this.facet[f] = Object.fromEntries((view.filters[f] ?? []).map((v) => [v, true]));
      this.query = view.query ?? "";
      this.page = 1;
    },
    clear() {
      this.pick(this.builtIn[0]);
    },
    sortBy(key: string) {
      if (this.sortKey === key) this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      else {
        this.sortKey = key;
        this.sortDir = "asc";
      }
    },
    ariaSort(key: string): string | null {
      return this.sortKey === key ? (this.sortDir === "asc" ? "ascending" : "descending") : null;
    },
    toggleAll(on: boolean) {
      for (const o of this.rows as CommerceOrder[]) this.sel[o.id] = on;
    },
    openSave() {
      this.viewName = "";
      this.saving = true;
    },
    saveView() {
      if (!this.viewName.trim()) return;
      const view: OrderView = { id: `view-${Date.now().toString(36)}-${(counter++).toString(36)}`, name: this.viewName, filters: this.filters, ...(this.query.trim() ? { query: this.query } : {}) };
      this.saved = upsertView(this.saved, view);
      this.saving = false;
      this.$root.dispatchEvent(new CustomEvent("nq-views-change", { bubbles: true, detail: { views: [...this.saved] } }));
    },
    removeSaved(view: OrderView) {
      this.saved = removeView(this.saved, view.id);
      if (this.current?.id === view.id) this.clear();
      this.$root.dispatchEvent(new CustomEvent("nq-views-change", { bubbles: true, detail: { views: [...this.saved] } }));
    },
    open(order: CommerceOrder) {
      this.$root.dispatchEvent(new CustomEvent("nq-open-order", { bubbles: true, detail: { order } }));
    },
    print(orders: CommerceOrder[], document: "invoice" | "packing-slip") {
      this.$root.dispatchEvent(new CustomEvent("nq-print", { bubbles: true, detail: { orders, document } }));
    },
    markFulfilled(orders: CommerceOrder[]) {
      const ok = orders.filter(canMarkFulfilled);
      if (!ok.length) return;
      const event = new CustomEvent("nq-mark-fulfilled", { bubbles: true, cancelable: true, detail: { orders: ok } });
      this.$root.dispatchEvent(event);
      if (event.defaultPrevented) return;
      const ids = new Set(ok.map((o) => o.id));
      this.orders = this.orders.map((o: CommerceOrder) => {
        if (!ids.has(o.id)) return o;
        const plan = planFulfilment(o, { picks: o.lines.map((l) => ({ lineId: l.id, quantity: lineOutstanding(l) })).filter((p) => p.quantity > 0) });
        return applyFulfilment(o, plan, { at: config.now ?? new Date().toISOString(), label: this.t.shippedAll });
      });
      this.sel = {};
    },
    exportOrders(rows: CommerceOrder[]) {
      const csv = ordersToCsv(rows, { currency: config.currency, digits: Math.round(Math.log10(commerceMinorFactor(config.currency))) });
      const event = new CustomEvent("nq-export", { bubbles: true, cancelable: true, detail: { orders: rows, csv } });
      this.$root.dispatchEvent(event);
      if (!event.defaultPrevented) download("orders.csv", csv);
    },
    init() {
      this.$watch("query", () => (this.page = 1));
      this.$watch("facet", () => (this.page = 1));
    },
  }));

  /* ------------------------------------------------------------------ order detail */
  Alpine.data("nqStoreOrderDetail", (config: DetailConfig) => ({
    ...helpers(config),
    order: config.order as CommerceOrder,
    refunds: [...(config.refunds ?? [])] as RefundRecord[],
    actor: config.actor ?? "",
    carriers: config.carriers ?? [],
    canBack: Boolean(config.canBack),
    fulfilOpen: false,
    refundOpen: false,
    cancelOpen: false,
    // fulfil dialog
    fqty: {} as Record<string, number>,
    carrier: (config.carriers ?? [])[0] ?? "",
    trackNo: "",
    // refund dialog
    rMode: ["lines"] as string[],
    rqty: {} as Record<string, number>,
    rShipping: false,
    rRestock: true,
    rAmount: "",
    rNote: "",
    note: "",

    get summary() {
      return paymentSummary(this.order, this.refunds);
    },
    get progress() {
      return fulfilmentProgress(this.order.lines);
    },
    get cancellable(): boolean {
      return canCancel(this.order);
    },
    get refundable(): boolean {
      return canRefund(this.order, this.refunds);
    },
    get shippable(): boolean {
      return this.order.lines.some((l: CommerceOrder["lines"][number]) => lineOutstanding(l) > 0) && !["cancelled", "refunded", "returned"].includes(this.order.status) && this.order.payment !== "failed";
    },
    get cancelPlan() {
      return planCancel(this.order, this.refunds);
    },
    get events() {
      return [...(this.order.events ?? [])].reverse().sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    },
    get trackUrl(): string | null {
      const tr = this.order.tracking;
      if (!tr) return null;
      return tr.url ?? (config.trackingTemplate ? config.trackingTemplate.replace("{number}", encodeURIComponent(tr.number)) : null);
    },
    get hasTotalsDiscount(): boolean {
      return this.order.totals.discount > 0;
    },
    lineFulfilled,
    lineOutstanding,
    lineRefunded,
    lineRefundable,
    meta(label: string, note?: string) {
      return { at: config.now ?? new Date().toISOString(), label, ...(this.actor ? { by: this.actor } : {}), ...(note ? { note } : {}) };
    },
    emit(detail: { order: CommerceOrder; refunds: RefundRecord[]; restock?: unknown }) {
      this.order = detail.order;
      this.refunds = detail.refunds;
      this.$root.dispatchEvent(new CustomEvent("nq-order-change", { bubbles: true, detail }));
    },
    back() {
      this.$root.dispatchEvent(new CustomEvent("nq-back", { bubbles: true }));
    },
    print(document: "invoice" | "packing-slip") {
      this.$root.dispatchEvent(new CustomEvent("nq-print", { bubbles: true, detail: { orders: [this.order], document } }));
    },
    addNote() {
      const text = this.note.trim();
      if (!text) return;
      this.emit({ order: applyNote(this.order, this.meta(this.t.noteAdded, text)), refunds: [...this.refunds] });
      this.note = "";
    },

    // fulfil
    openFulfil() {
      this.fqty = Object.fromEntries(this.order.lines.map((l: CommerceOrder["lines"][number]) => [l.id, lineOutstanding(l)]));
      this.trackNo = "";
      this.fulfilOpen = true;
    },
    get fpicks() {
      return this.order.lines.map((l: CommerceOrder["lines"][number]) => ({ lineId: l.id, quantity: Math.min(Math.max(0, Math.floor(Number(this.fqty[l.id]) || 0)), lineOutstanding(l)) }));
    },
    get shipment() {
      return this.trackNo.trim() ? { carrier: this.carrier, number: this.trackNo.trim() } : undefined;
    },
    get fplan() {
      return planFulfilment(this.order, { picks: this.fpicks, ...(this.shipment ? { carrier: this.shipment.carrier, trackingNumber: this.shipment.number } : {}) });
    },
    get fOk(): boolean {
      return this.fplan.issues.filter((i: { code: string }) => i.code !== "tracking-number").length === 0 && this.fpicks.some((p: { quantity: number }) => p.quantity > 0);
    },
    get fMessage(): string {
      return this.fOk ? (this.fplan.completes ? this.t.willCompleteOrder : this.t.willPartlyShip) : this.t.pickUnits;
    },
    confirmFulfil() {
      if (!this.fOk) return;
      const plan = this.fplan;
      const tracking = this.shipment;
      this.emit({
        order: applyFulfilment(this.order, plan, this.meta(plan.completes ? this.t.shippedAll : this.t.shippedSome, tracking ? `${tracking.carrier} ${tracking.number}` : undefined), tracking),
        refunds: [...this.refunds],
      });
      this.fulfilOpen = false;
    },

    // refund
    openRefund() {
      this.rqty = {};
      this.rShipping = false;
      this.rAmount = "";
      this.rNote = "";
      this.rMode = ["lines"];
      this.refundOpen = true;
    },
    get rLines(): boolean {
      return this.rMode[0] !== "amount";
    },
    get remaining(): number {
      return refundRemaining(this.order, this.refunds);
    },
    get shippingAvailable(): boolean {
      return this.order.totals.shipping > 0 && !shippingRefunded(this.refunds);
    },
    get rPicks() {
      return this.order.lines.map((l: CommerceOrder["lines"][number]) => ({ lineId: l.id, quantity: Math.max(0, Math.floor(Number(this.rqty[l.id]) || 0)) }));
    },
    get rAmountMinor(): number {
      const n = Math.round(Number(this.rAmount) * this.factor);
      return Number.isFinite(n) ? n : 0;
    },
    get rPlan() {
      return this.rLines
        ? planRefund(this.order, this.refunds, { mode: "lines", picks: this.rPicks, includeShipping: this.rShipping, restock: this.rRestock, note: this.rNote })
        : planRefund(this.order, this.refunds, { mode: "amount", amount: this.rAmountMinor, note: this.rNote });
    },
    get rTouched(): boolean {
      return this.rLines ? this.rPicks.some((p: { quantity: number }) => p.quantity > 0) || this.rShipping : this.rAmount !== "";
    },
    get rMessage(): string | null {
      const p = this.rPlan.issues.find((i: { code: string }) => i.code !== "empty");
      if (!this.rTouched || !p) return null;
      switch (p.code) {
        case "amount-over":
          return this.tt("refundOver", { max: this.money(p.max) });
        case "amount-invalid":
          return this.t.refundInvalid;
        case "line-over":
          return this.tt("refundLineOver", { max: p.max });
        case "shipping-done":
          return this.t.shippingDone;
        case "unpaid":
          return this.t.refundUnpaid;
        default:
          return null;
      }
    },
    get rTotal(): number {
      return this.rPlan.ok || !this.rMessage ? this.rPlan.amount : 0;
    },
    rLineValue(id: string): number {
      return this.rPlan.perLine.find((p: { lineId: string }) => p.lineId === id)?.amount ?? 0;
    },
    confirmRefund() {
      const plan = this.rPlan;
      if (!plan.ok) return;
      const next = applyRefund(this.order, this.refunds, plan, this.meta(this.t.refundIssued));
      this.emit({ ...next, ...(plan.restock.length ? { restock: plan.restock } : {}) });
      this.refundOpen = false;
    },

    // cancel
    confirmCancel() {
      const plan = this.cancelPlan;
      const next = applyCancel(this.order, this.refunds, this.meta(this.t.cancelled));
      this.emit({ ...next, ...(plan.restock.length ? { restock: plan.restock } : {}) });
    },
  }));

  /* ------------------------------------------------------------------ abandoned carts */
  Alpine.data("nqStoreAbandonedCarts", (config: CartsConfig) => ({
    ...helpers(config),
    carts: [...config.carts] as AbandonedCart[],
    clock: config.now,
    rules: config.rules ?? {},
    maxPercent: config.maxDiscountPercent ?? 20,
    loading: Boolean(config.loading),
    error: Boolean(config.error),
    canSend: config.canSend !== false,
    dialogOpen: false,
    target: null as AbandonedCart | null,
    percent: 0 as number | string,
    message: "",

    get stats() {
      return recoveryStats(this.carts, this.clock, this.rules);
    },
    get atRisk(): string {
      return this.money(this.stats.atRisk);
    },
    get rate(): string {
      return new Intl.NumberFormat(new Intl.Locale(config.locale ?? "en", { numberingSystem: "latn" }).toString(), { style: "percent", maximumFractionDigits: 0 }).format(this.stats.rateBps / 10000);
    },
    get rows() {
      return [...this.carts]
        .sort((a: AbandonedCart, b: AbandonedCart) => cartValue(b) - cartValue(a))
        .map((cart: AbandonedCart) => ({
          cart,
          id: cart.id,
          status: recoveryStatus(cart, this.clock, this.rules),
          gate: canSendRecovery(cart, this.clock, this.rules),
          why: this.blockText(cart),
          idle: this.idleText(cartIdleMinutes(cart, this.clock)),
          value: this.money(cartValue(cart)),
          count: this.num(cartItemCount(cart)),
          names: cart.lines.map((l) => l.name).join(config.locale?.startsWith("ar") ? "، " : ", "),
        }));
    },
    get pct(): number {
      return Math.min(Math.max(Number.parseInt(String(this.percent), 10) || 0, 0), this.maxPercent);
    },
    get discountText(): string {
      return this.target && this.pct > 0 ? this.money(recoveryDiscount(cartValue(this.target), this.pct)) : "";
    },
    blockText(cart: AbandonedCart): string | null {
      const gate = canSendRecovery(cart, this.clock, this.rules);
      if (gate.ok) return null;
      switch (gate.reason) {
        case "recovered":
          return this.t.blockRecovered;
        case "lost":
          return this.t.blockLost;
        case "no-email":
          return this.t.blockNoEmail;
        case "too-soon":
          return this.tt("blockTooSoon", { min: gate.waitMinutes ?? 0 });
        case "cooldown":
          return this.tt("blockCooldown", { h: Math.ceil((gate.waitMinutes ?? 0) / 60) });
        default:
          return this.t.blockLimit;
      }
    },
    idleText(minutes: number): string {
      return minutes < 60 ? this.tt("idleMinutes", { n: minutes }) : minutes < 60 * 48 ? this.tt("idleHours", { n: Math.floor(minutes / 60) }) : this.tt("idleDays", { n: Math.floor(minutes / 1440) });
    },
    statusVariant(status: string): string {
      return ({ new: "warning", emailed: "info", recovered: "success", lost: "neutral", "no-email": "neutral" } as Record<string, string>)[status] ?? "neutral";
    },
    emailsText(cart: AbandonedCart): string {
      if (cart.emailsSent <= 0) return "";
      const base = cart.emailsSent === 1 ? this.t.emailsSentOne : this.tt("emailsSent", { n: cart.emailsSent });
      return cart.lastEmailAt ? `${base} · ${this.date(cart.lastEmailAt)}` : base;
    },
    open(cart: AbandonedCart) {
      this.target = cart;
      this.percent = 0;
      this.message = "";
      this.dialogOpen = true;
    },
    send() {
      const cart = this.target as AbandonedCart | null;
      if (!cart) return;
      const detail = { cartId: cart.id, discountPercent: this.pct, discountAmount: recoveryDiscount(cartValue(cart), this.pct), message: this.message.trim() };
      const event = new CustomEvent("nq-send-recovery", { bubbles: true, cancelable: true, detail });
      this.$root.dispatchEvent(event);
      if (!event.defaultPrevented) {
        const at = new Date(this.clock).toISOString();
        this.carts = this.carts.map((c: AbandonedCart) => (c.id === cart.id ? { ...c, emailsSent: c.emailsSent + 1, lastEmailAt: at } : c));
      }
      this.dialogOpen = false;
    },
  }));

  /* ------------------------------------------------------------------ print view */
  Alpine.data("nqStoreOrderPrintView", (config: { kind?: string }) => ({
    kind: [config.kind === "packing-slip" ? "packing-slip" : "invoice"] as string[],
    get current(): string {
      return this.kind[0] ?? "invoice";
    },
    print() {
      window.print();
    },
    back() {
      this.$root.dispatchEvent(new CustomEvent("nq-back", { bubbles: true }));
    },
  }));
};
