import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import {
  NqStoreAbandonedCarts,
  NqStoreMoney,
  NqStoreOrderDetail,
  NqStoreOrderDocument,
  NqStoreOrderPrintView,
  NqStoreOrdersList,
  storeApplyFulfilment,
  storeFilterOrders,
  storeOrdersToCsv,
  storePaymentSummary,
  storePlanFulfilment,
  storePlanRefund,
  type StoreAdminOrder,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const order = (over: Partial<StoreAdminOrder> = {}): StoreAdminOrder => ({
  id: "o1",
  number: "#1042",
  placedAt: "2026-09-27T10:15:00Z",
  status: "paid",
  payment: "paid",
  customer: { name: "Mona Salem", email: "mona@example.com" },
  lines: [
    { id: "l1", productId: "p1", variantId: "v1", name: "Coffee beans 250g", unitPrice: 1800, quantity: 2 },
    { id: "l2", productId: "p2", variantId: "v2", name: "Paper filters", unitPrice: 600, quantity: 1 },
  ],
  shippingAddress: { name: "Mona Salem", line1: "12 Olaya St", city: "Riyadh", country: "SA" },
  totals: { subtotal: 4200, discount: 0, shipping: 500, tax: 0, total: 4700, itemCount: 3, savings: 0 },
  ...over,
});
const orders = [order(), order({ id: "o2", number: "#1041", status: "pending", payment: "pending", customer: { name: "Omar Haddad" } })];

const wrap = (node: () => ReturnType<typeof h>, locale = "en") => mount(NasaqProvider, { props: { locale }, slots: { default: node }, attachTo: document.body });

describe("order maths", () => {
  it("plans and applies a partial shipment", () => {
    const o = order();
    const plan = storePlanFulfilment(o, { picks: [{ lineId: "l1", quantity: 2 }] });
    expect(plan.completes).toBe(false);
    const next = storeApplyFulfilment(o, plan, { at: "2026-09-29T09:00:00Z", label: "Shipped" });
    expect(next.lines[0]!.fulfilled).toBe(2);
  });
  it("refunds a line and sums the payment", () => {
    const o = order();
    const plan = storePlanRefund(o, [], { mode: "lines", picks: [{ lineId: "l2", quantity: 1 }], includeShipping: false, restock: true });
    expect(plan.ok).toBe(true);
    expect(plan.amount).toBe(600);
    expect(storePaymentSummary(o, []).total).toBe(4700);
  });
  it("filters and exports", () => {
    expect(storeFilterOrders(orders, { filters: {}, query: "omar" }).map((x) => x.id)).toEqual(["o2"]);
    expect(storeOrdersToCsv(orders, { currency: "USD" }).split("\n").length).toBeGreaterThan(2);
  });
});

describe("NqStoreMoney", () => {
  it("formats minor units in USD and SAR in Arabic", () => {
    const en = wrap(() => h(NqStoreMoney, { amount: 4700, currency: "USD" }));
    expect(en.text()).toContain("47");
    const ar = wrap(() => h(NqStoreMoney, { amount: 4700, currency: "SAR" }), "ar");
    expect(ar.html()).toBeTruthy();
  });
});

describe("NqStoreOrdersList", () => {
  it("lists orders with view counts and opens one", async () => {
    const onOpenOrder = vi.fn();
    const w = wrap(() => h(NqStoreOrdersList, { orders, currency: "USD", onOpenOrder }));
    const root = w.find("[data-slot='store-orders-list']");
    expect(root.exists()).toBe(true);
    expect(w.text()).toContain("#1042");
    expect(w.text()).toContain("#1041");
    await w.find("input[type='search'], input").setValue("omar");
    await nextTick();
    expect(w.text()).not.toContain("#1042");
  });
  it("shows the empty state", () => {
    const w = wrap(() => h(NqStoreOrdersList, { orders: [], currency: "USD" }));
    expect(w.text()).toContain("No orders yet");
  });
  it("renders in Arabic", () => {
    const w = wrap(() => h(NqStoreOrdersList, { orders }), "ar");
    expect(w.text()).toContain("الطلبات");
  });
});

describe("NqStoreOrderDetail", () => {
  it("shows the lines, payment and unpaid alert", () => {
    const w = wrap(() => h(NqStoreOrderDetail, { order: orders[1]!, currency: "USD" }));
    expect(w.find("[data-slot='store-order-detail']").exists()).toBe(true);
    expect(w.text()).toContain("Payment not received");
    expect(w.text()).toContain("Coffee beans 250g");
  });
  it("calls onBack and onPrint", async () => {
    const onBack = vi.fn();
    const onPrint = vi.fn();
    const w = wrap(() => h(NqStoreOrderDetail, { order: orders[0]!, currency: "USD", onBack, onPrint }));
    const buttons = w.findAll("button");
    await buttons.find((b) => b.text().includes("Back to orders"))!.trigger("click");
    await buttons.find((b) => b.text() === "Invoice")!.trigger("click");
    expect(onBack).toHaveBeenCalled();
    expect(onPrint).toHaveBeenCalledWith("invoice");
  });
  it("disables refund on an unpaid order", () => {
    const w = wrap(() => h(NqStoreOrderDetail, { order: orders[1]!, currency: "USD" }));
    const refund = w.findAll("button").find((b) => b.text() === "Refund")!;
    expect(refund.attributes("disabled")).toBeDefined();
  });
});

describe("NqStoreOrderDocument", () => {
  it("renders an invoice and a packing slip", () => {
    const seller = { name: "Nasaq Coffee", taxId: "300123" };
    const inv = wrap(() => h(NqStoreOrderDocument, { kind: "invoice", order: orders[0]!, seller, currency: "USD" }));
    expect(inv.find("[data-slot='store-order-document']").attributes("data-kind")).toBe("invoice");
    expect(inv.text()).toContain("300123");
    const slip = wrap(() => h(NqStoreOrderDocument, { kind: "packing-slip", order: orders[0]!, seller, currency: "USD" }));
    expect(slip.find("[data-slot='store-order-document']").attributes("data-kind")).toBe("packing-slip");
    expect(slip.text()).not.toContain("300123");
  });
  it("prints many documents", () => {
    const w = wrap(() => h(NqStoreOrderPrintView, { orders, seller: { name: "Shop" }, currency: "USD" }));
    expect(w.findAll("[data-slot='store-order-document']").length).toBe(2);
  });
});

describe("NqStoreAbandonedCarts", () => {
  const now = Date.parse("2026-09-29T09:00:00Z");
  const carts = [
    { id: "c1", customer: { name: "Sara", email: "sara@example.com" }, lines: [{ id: "x", productId: "p", variantId: "v", name: "Beans", unitPrice: 1800, quantity: 2 }], lastActivityAt: "2026-09-28T01:00:00Z", stage: "checkout" as const, emailsSent: 0 },
    { id: "c2", customer: null, lines: [{ id: "y", productId: "p", variantId: "v", name: "Filters", unitPrice: 600, quantity: 1 }], lastActivityAt: "2026-09-28T01:00:00Z", stage: "cart" as const, emailsSent: 0 },
  ];
  it("lists carts and blocks a guest", () => {
    const w = wrap(() => h(NqStoreAbandonedCarts, { carts, now, currency: "USD", onSendRecovery: () => {} }));
    expect(w.text()).toContain("Sara");
    expect(w.text()).toContain("Guest");
    expect(w.text()).toContain("No email address");
  });
  it("shows the empty and error states", () => {
    expect(wrap(() => h(NqStoreAbandonedCarts, { carts: [], now })).text()).toContain("No abandoned carts");
    const onRetry = vi.fn();
    const w = wrap(() => h(NqStoreAbandonedCarts, { carts: [], error: true, onRetry }));
    expect(w.text()).toContain("could not be loaded");
  });
});
