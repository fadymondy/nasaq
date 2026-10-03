import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import {
  NqStoreAccountNav,
  NqStoreAccountOrder,
  NqStoreAddressBook,
  NqStoreOrderHistory,
  NqStoreRecentlyViewed,
  NqStoreReturnRequest,
  NqStoreReturnStatus,
  NqStoreWishlist,
  STORE_ACCOUNT_STRINGS,
  storeAddressLines,
  storeBackInStock,
  storeFilterCustomerOrders,
  storeOrderGroup,
  storeOrderGroupCounts,
  storePushRecentlyViewed,
  storeRefundEstimate,
  storeRemoveAddress,
  storeReorderPlan,
  storeUpsertAddress,
  storeValidateAddress,
  storeWishlistEntries,
} from ".";
import type { CommerceAddress, CommerceOrder, CommerceProduct, CommerceReturnRequest } from "./commerce";

const line = (id: string, name: string, unitPrice: number, quantity: number, extra = {}) => ({ id, productId: `p-${id}`, variantId: `v-${id}`, name, unitPrice, quantity, ...extra });
const order = (over: Partial<CommerceOrder> = {}): CommerceOrder => ({
  id: "o1",
  number: "#1040",
  placedAt: "2026-09-20T10:00:00Z",
  status: "delivered",
  payment: "paid",
  customer: { name: "Sara" },
  lines: [line("a", "Tee", 10000, 2, { fulfilled: 2 }), line("b", "Mug", 5000, 1, { fulfilled: 1 })],
  totals: { subtotal: 25000, discount: 0, shipping: 3000, tax: 0, total: 28000, itemCount: 3, savings: 0 },
  events: [{ at: "2026-09-25T10:00:00Z", kind: "delivered", label: "Delivered" }],
  ...over,
});
const products: CommerceProduct[] = [
  { id: "p-a", name: "Tee", images: [], options: [], variants: [{ id: "v-a", options: {}, price: 11000, stock: 1 }] },
  { id: "p-b", name: "Mug", images: [], options: [], variants: [{ id: "v-b", options: {}, price: 5000, stock: 0 }] },
  { id: "p-c", name: "Cap", images: [], options: [], variants: [{ id: "v-c", options: {}, price: 2000 }], status: "archived" },
];
const home: CommerceAddress = { id: "home", name: "Sara", phone: "+20 100 123 4567", line1: "12 Palm St", city: "Cairo", country: "EG", isDefault: true };
const request: CommerceReturnRequest = { id: "r1", number: "RMA-1001", orderId: "o1", createdAt: "2026-09-26T10:00:00Z", status: "approved", lines: [{ lineId: "b", quantity: 1 }], reason: "defective", refundMethod: "original", refundAmount: 5000 };
const now = new Date("2026-09-27T00:00:00Z");

describe("account logic", () => {
  it("groups and filters orders", () => {
    expect(storeOrderGroup("shipped")).toBe("active");
    expect(storeOrderGroup("refunded")).toBe("returns");
    const orders = [order({ id: "1", number: "#1" }), order({ id: "2", number: "#2", status: "shipped" }), order({ id: "3", number: "#3", status: "cancelled" })];
    expect(storeFilterCustomerOrders(orders, { group: "active" }).map((o) => o.id)).toEqual(["2"]);
    expect(storeOrderGroupCounts(orders)).toEqual({ all: 3, active: 1, delivered: 1, returns: 0, cancelled: 1 });
  });
  it("plans a reorder against the catalogue", () => {
    const plan = storeReorderPlan(order({ lines: [line("a", "Tee", 10000, 2), line("b", "Mug", 5000, 1), line("c", "Cap", 2000, 1)] }), products);
    expect(plan.add.map((l) => [l.lineId, l.quantity])).toEqual([["a", 1]]);
    expect(plan.skipped.map((s) => [s.lineId, s.reason])).toEqual([["b", "out"], ["c", "missing"]]);
  });
  it("reads the wishlist and recent list", () => {
    const items = [{ id: "1", productId: "p-b", variantId: "v-b", addedAt: "x", notify: true }];
    expect(storeWishlistEntries(items, products)[0]?.availability).toBe("out");
    const back = products.map((p) => (p.id === "p-b" ? { ...p, variants: [{ ...p.variants[0]!, stock: 9 }] } : p));
    expect(storeBackInStock(items, back).map((i) => i.id)).toEqual(["1"]);
    expect(storePushRecentlyViewed(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
  });
  it("validates and edits the address book", () => {
    expect(storeValidateAddress(home)).toEqual({});
    expect(storeValidateAddress({})).toMatchObject({ name: "required", phone: "required" });
    const two = storeUpsertAddress([home], { id: "work", name: "S", line1: "1", city: "G", country: "EG", phone: "0100000000" });
    expect(two.map((a) => a.isDefault)).toEqual([true, false]);
    expect(storeRemoveAddress(two, "home").map((a) => [a.id, a.isDefault])).toEqual([["work", true]]);
    expect(storeAddressLines({ ...home, region: "Nasr", postalCode: "11765" })).toEqual(["12 Palm St", "Nasr, Cairo", "11765"]);
  });
  it("estimates a refund", () => {
    expect(storeRefundEstimate(order(), [{ lineId: "b", quantity: 1 }])).toBe(5000);
  });
  it("ships en and ar strings", () => {
    expect(STORE_ACCOUNT_STRINGS.en.navOrders).toBeTruthy();
    expect(STORE_ACCOUNT_STRINGS.ar.navOrders).not.toBe(STORE_ACCOUNT_STRINGS.en.navOrders);
  });
});

describe("account components", () => {
  it("nav navigates", async () => {
    const onNavigate = vi.fn();
    const w = mount(NqStoreAccountNav, { props: { active: "orders", counts: { wishlist: 3 }, onNavigate } });
    const buttons = w.findAll("button, a");
    expect(buttons.length).toBe(5);
    await buttons[2]!.trigger("click");
    expect(onNavigate).toHaveBeenCalledWith("wishlist");
  });

  it("order history lists orders in the store currency", () => {
    const w = mount(NqStoreOrderHistory, { props: { orders: [order()], products, currency: "USD" } });
    expect(w.text()).toContain("#1040");
    expect(w.text()).toContain("$");
  });

  it("order history error state retries", async () => {
    const onRetry = vi.fn();
    const w = mount(NqStoreOrderHistory, { props: { orders: [], error: true, onRetry } });
    await w.find("button").trigger("click");
    expect(onRetry).toHaveBeenCalled();
  });

  it("account order offers a return inside the window", async () => {
    const onReturn = vi.fn();
    const w = mount(NqStoreAccountOrder, { props: { order: order(), products, now, onReturn } });
    expect(w.text()).toContain("#1040");
    const btn = w.findAll("button").find((b) => /return/i.test(b.text()));
    expect(btn).toBeTruthy();
    await btn!.trigger("click");
    expect(onReturn).toHaveBeenCalled();
  });

  it("return request renders the returnable lines", () => {
    const w = mount(NqStoreReturnRequest, { props: { order: order(), now } });
    expect(w.text()).toContain("Tee");
  });

  it("return status shows the steps and cancels after confirmation", async () => {
    const onCancel = vi.fn();
    const w = mount(NqStoreReturnStatus, { props: { request, order: order(), onCancel }, attachTo: document.body });
    expect(w.text()).toContain("RMA-1001");
    await w.findAll("button").find((b) => /cancel/i.test(b.text()))!.trigger("click");
    await flushPromises();
    const confirm = [...document.body.querySelectorAll("button")].filter((b) => /cancel/i.test(b.textContent ?? "")).pop();
    confirm?.click();
    await flushPromises();
    expect(onCancel).toHaveBeenCalledWith(request);
    w.unmount();
  });

  it("wishlist offers move-to-cart and notify", async () => {
    const onMoveToCart = vi.fn();
    const onToggleNotify = vi.fn();
    const items = [
      { id: "1", productId: "p-a", variantId: "v-a", addedAt: "2026-09-01T00:00:00Z", priceWhenSaved: 12000 },
      { id: "2", productId: "p-b", variantId: "v-b", addedAt: "2026-09-02T00:00:00Z" },
    ];
    const w = mount(NqStoreWishlist, { props: { items, products, currency: "USD", onMoveToCart, onToggleNotify } });
    const buttons = w.findAll("button");
    await buttons.find((b) => /cart/i.test(b.text()))!.trigger("click");
    expect(onMoveToCart).toHaveBeenCalledTimes(1);
    await buttons.find((b) => /notify/i.test(b.text()))!.trigger("click");
    expect(onToggleNotify.mock.calls[0]?.[0].id).toBe("2");
  });

  it("recently viewed skips archived products and clears", async () => {
    const onClear = vi.fn();
    const w = mount(NqStoreRecentlyViewed, { props: { ids: ["p-a", "p-c", "p-b"], products, onClear } });
    expect(w.findAll("li").length).toBe(2);
    await w.findAll("button").find((b) => /clear/i.test(b.text()))!.trigger("click");
    expect(onClear).toHaveBeenCalled();
  });

  it("address book sets a default", async () => {
    const onChange = vi.fn();
    const w = mount(NqStoreAddressBook, { props: { addresses: [home, { ...home, id: "work", isDefault: false, line1: "45 Tahrir" }], onChange } });
    expect(w.text()).toContain("12 Palm St");
    await w.findAll("button").find((b) => /set as default/i.test(b.text()))!.trigger("click");
    expect(onChange.mock.calls[0]?.[0].map((a: CommerceAddress) => a.isDefault)).toEqual([false, true]);
  });
});
