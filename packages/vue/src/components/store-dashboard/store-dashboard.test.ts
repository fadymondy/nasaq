import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqStoreDashboard, STORE_DASHBOARD_LAYOUT, storeLowStock, storeKpis, storePeriodChange, storeTopN } from ".";

const totals = { sales: 4_820_000, orders: 312, sessions: 9_400, customers: 280, returningCustomers: 96, addToCart: 1_320, checkouts: 540 };
const previousTotals = { ...totals, sales: 4_210_000 };
const series = [
  { date: "2026-09-27", sales: 1_520_000, orders: 98, sessions: 3_000 },
  { date: "2026-09-28", sales: 1_610_000, orders: 104, sessions: 3_100 },
];
const products = [
  {
    id: "p1",
    name: "Linen shirt",
    status: "active",
    images: [],
    options: [{ id: "size", values: [{ id: "m", label: "M" }] }],
    variants: [
      { id: "v1", sku: "LS-M", options: { size: "m" }, stock: 2 },
      { id: "v2", sku: "LS-X", options: { size: "m" }, stock: 0 },
      { id: "v3", sku: "LS-OK", options: { size: "m" }, stock: 50 },
    ],
  },
  { id: "p2", name: "Draft", status: "draft", images: [], options: [], variants: [{ id: "v9", options: {}, stock: 0 }] },
];
const orders = [{ id: "o1", number: "#1042", placedAt: "2026-09-29T08:12:00Z", status: "paid" as const, customer: { name: "Sara Ali" }, totals: { total: 18_500 } }];
const base = {
  currency: "USD",
  totals,
  previousTotals,
  series,
  topProducts: [{ id: "p1", name: "Linen shirt", units: 120, revenue: 960_000 }],
  categories: [{ id: "c1", label: "Shirts", value: 2_100_000 }],
  channels: [
    { id: "web", label: "Website", value: 3_000_000 },
    { id: "app", label: "App", value: 1_200_000 },
  ],
  cities: [{ id: "ny", label: "New York", value: 1_800_000 }],
  products,
  recentOrders: orders,
};

describe("store dashboard maths", () => {
  it("computes change, top-n and the low-stock list", () => {
    expect(storePeriodChange(110, 100)).toBeCloseTo(0.1);
    expect(storePeriodChange(5, 0)).toBeUndefined();
    expect(storeKpis(totals, previousTotals).sales.change).toBeCloseTo(0.1449, 3);
    expect(storeTopN([{ value: 1 }, { value: 3 }, { value: 2 }], 2).map((r) => r.value)).toEqual([3, 2]);
    const low = storeLowStock(products as never, 5);
    expect(low.map((i) => [i.variantId, i.level])).toEqual([["v2", "out"], ["v1", "low"]]);
    expect(low[1]?.variantLabel).toBe("M");
    expect(STORE_DASHBOARD_LAYOUT).toHaveLength(8);
  });
});

describe("NqStoreDashboard", () => {
  it("renders the KPIs, live visitors and the widgets", () => {
    const w = mount(NqStoreDashboard, { props: { ...base, liveVisitors: { count: 74, history: [60, 70, 74] } } });
    expect(w.attributes("data-slot")).toBe("store-dashboard");
    expect(w.find('[data-slot="store-dashboard-kpis"]').findAll('[data-slot="stat-card"]')).toHaveLength(5);
    expect(w.find('[data-slot="store-dashboard-live"]').text()).toContain("74");
    expect(w.text()).toContain("$48,200");
    expect(w.text()).toContain("Linen shirt");
    expect(w.text()).toContain("Website");
    expect(w.text()).toContain("#1042");
    expect(w.text()).toContain("Out of stock");
    expect(w.findAll('[data-slot="store-dashboard-low-stock"] li')).toHaveLength(2);
  });
  it("calls onRestock and onOpenProduct", async () => {
    const onRestock = vi.fn();
    const onOpenProduct = vi.fn();
    const w = mount(NqStoreDashboard, { props: { ...base, onRestock, onOpenProduct } });
    await w.find('[data-slot="store-dashboard-low-stock"] button[aria-label^="Restock"]').trigger("click");
    expect(onRestock).toHaveBeenCalledWith(expect.objectContaining({ variantId: "v2" }));
    await w.find('[data-slot="store-dashboard-top-products"] button').trigger("click");
    expect(onOpenProduct).toHaveBeenCalledWith("p1");
  });
  it("shows the empty and error states", async () => {
    const empty = mount(NqStoreDashboard, { props: { ...base, series: [], totals: { ...totals, orders: 0, sessions: 0 } } });
    expect(empty.find('[data-slot="empty-state"]').exists()).toBe(true);
    const onRetry = vi.fn();
    const err = mount(NqStoreDashboard, { props: { ...base, error: true, onRetry } });
    expect(err.find('[data-slot="error-state"]').exists()).toBe(true);
    await err.find("button").trigger("click");
    expect(onRetry).toHaveBeenCalled();
  });
});
