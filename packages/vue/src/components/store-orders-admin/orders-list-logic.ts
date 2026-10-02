/*
 * The order list's pure logic: search, filters, saved views, counts and CSV export. Same rules as the table's own
 * search and facet filters, so a view's badge count always matches what the table shows.
 */
import type { CommerceOrder } from "./order-types";
import { fulfilmentState, outstandingPicks, planFulfilment, type FulfilmentState } from "./order-math";

/** Fulfilment as the list shows it. Orders that will never ship (cancelled, refunded, returned) read as "none". */
export function orderFulfilment(order: Pick<CommerceOrder, "lines" | "status">): FulfilmentState {
  if (order.status === "cancelled" || order.status === "refunded" || order.status === "returned") return "none";
  return fulfilmentState(order.lines);
}

/** Column id → allowed values. Empty or missing means no filter on that column. */
export type OrderFilters = Record<string, string[]>;

export interface OrderView {
  id: string;
  name: string;
  filters: OrderFilters;
  query?: string;
}

/** Lower-case, strip accents and Arabic diacritics, and fold the letters people type interchangeably. */
export function foldText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}

/** The text a search matches: number, customer, contact, products and tracking number. */
export function orderSearchText(order: CommerceOrder): string {
  return foldText(
    [order.number, order.customer.name, order.customer.email, order.customer.phone, order.tracking?.number, ...order.lines.map((l) => l.name)].filter(Boolean).join(" "),
  );
}

/** Column values a filter compares against. */
export function orderFilterValue(order: CommerceOrder, column: string): string {
  if (column === "status") return order.status;
  if (column === "payment") return order.payment;
  if (column === "fulfilment") return orderFulfilment(order);
  return "";
}

export function matchesOrder(order: CommerceOrder, state: { filters?: OrderFilters; query?: string }): boolean {
  for (const [column, values] of Object.entries(state.filters ?? {})) {
    if (values.length && !values.includes(orderFilterValue(order, column))) return false;
  }
  const query = foldText(state.query ?? "");
  return !query || query.split(/\s+/).every((word) => orderSearchText(order).includes(word));
}

export const filterOrders = (orders: readonly CommerceOrder[], state: { filters?: OrderFilters; query?: string }) => orders.filter((o) => matchesOrder(o, state));

const norm = (filters: OrderFilters = {}) =>
  Object.entries(filters)
    .filter(([, v]) => v.length)
    .map(([k, v]) => `${k}=${[...v].sort().join(",")}`)
    .sort()
    .join("&");

export const sameFilters = (a: OrderFilters = {}, b: OrderFilters = {}) => norm(a) === norm(b);

/** The saved view whose filters and search equal the current state, if any. */
export function activeView(views: readonly OrderView[], state: { filters?: OrderFilters; query?: string }): OrderView | undefined {
  return views.find((v) => sameFilters(v.filters, state.filters) && foldText(v.query ?? "") === foldText(state.query ?? ""));
}

export function viewCounts(orders: readonly CommerceOrder[], views: readonly OrderView[]): Record<string, number> {
  return Object.fromEntries(views.map((v) => [v.id, filterOrders(orders, v).length]));
}

/** Adds a view, or replaces the one with the same id. A blank name is refused. */
export function upsertView(views: readonly OrderView[], view: OrderView): OrderView[] {
  const name = view.name.trim();
  if (!name) return [...views];
  const next = { ...view, name, filters: Object.fromEntries(Object.entries(view.filters).filter(([, v]) => v.length)) };
  return views.some((v) => v.id === view.id) ? views.map((v) => (v.id === view.id ? next : v)) : [...views, next];
}

export const removeView = (views: readonly OrderView[], id: string) => views.filter((v) => v.id !== id);

/* ------------------------------------------------------------------ CSV */

/** 12345 → "123.45". Integer maths, so no float drift. `digits` is the currency's minor-unit exponent. */
export function storeFormatMinor(amount: number, digits = 2): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(amount));
  if (digits <= 0) return `${sign}${abs}`;
  const base = 10 ** digits;
  return `${sign}${Math.floor(abs / base)}.${String(abs % base).padStart(digits, "0")}`;
}

/** One CSV cell: quoted when needed, and a leading = + - @ is defused so a spreadsheet never runs it as a formula. */
export function csvCell(value: string | number | undefined): string {
  let text = value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const ORDER_CSV_COLUMNS = ["number", "date", "customer", "email", "status", "payment", "fulfilment", "items", "subtotal", "discount", "shipping", "tax", "total", "currency", "tracking"] as const;

export function ordersToCsv(orders: readonly CommerceOrder[], options: { currency?: string; digits?: number } = {}): string {
  const { currency = "", digits = 2 } = options;
  const rows = orders.map((o) => [
    o.number,
    o.placedAt.slice(0, 10),
    o.customer.name,
    o.customer.email,
    o.status,
    o.payment,
    orderFulfilment(o),
    o.totals.itemCount,
    storeFormatMinor(o.totals.subtotal, digits),
    storeFormatMinor(o.totals.discount, digits),
    storeFormatMinor(o.totals.shipping, digits),
    storeFormatMinor(o.totals.tax, digits),
    storeFormatMinor(o.totals.total, digits),
    currency,
    o.tracking?.number,
  ]);
  return [ORDER_CSV_COLUMNS.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n");
}

/** Whether "mark fulfilled" can do anything for this order: something is outstanding and the order is not blocked. */
export const canMarkFulfilled = (order: CommerceOrder) => planFulfilment(order, { picks: outstandingPicks(order.lines) }).ok;
