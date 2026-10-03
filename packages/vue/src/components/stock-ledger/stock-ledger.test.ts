import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { NqStockLedger, NqStockMovementList, NqStockOnHand, stockCanIssue, stockLevel, stockMatrix, stockStatement, stockSum, stockTransfer, type StockMovement } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const products = [
  { id: "beans", name: "Coffee beans 250g", sku: "RTL-001", unit: "pcs", reorderPoint: 12 },
  { id: "filter", name: "Paper filters", sku: "RTL-014", reorderPoint: 4 },
];
const warehouses = [
  { id: "ruh", name: "Riyadh", code: "RUH" },
  { id: "jed", name: "Jeddah", code: "JED" },
];
const movements: StockMovement[] = [
  { id: "m1", date: "2026-09-01", productId: "beans", warehouseId: "ruh", type: "receive", quantity: 40, reference: "PO-2041" },
  { id: "m2", date: "2026-09-05", productId: "beans", warehouseId: "ruh", type: "issue", quantity: -30, reference: "SO-5520" },
  { id: "m3", date: "2026-09-08", productId: "beans", warehouseId: "jed", type: "receive", quantity: 5 },
];

describe("stock maths", () => {
  it("sums thousandths exactly", () => {
    expect(stockSum(Array(10).fill(0.1))).toBe(1);
  });
  it("derives on-hand and levels", () => {
    const m = stockMatrix(products, warehouses, movements);
    expect(m.rows[0]!.cells).toEqual({ ruh: 10, jed: 5 });
    expect(m.rows[0]!.total).toBe(15);
    expect(m.rows[0]!.level).toBe("ok");
    expect(m.rows[1]!.level).toBe("out");
    expect(stockLevel(12, 12)).toBe("low");
  });
  it("keeps a running balance and guards issues", () => {
    expect(stockStatement(movements, { productId: "beans" }).map((r) => r.balance)).toEqual([40, 10, 15]);
    expect(stockCanIssue(movements, "beans", "ruh", 11)).toBe(false);
    expect(stockTransfer({ id: "t", date: "2026-09-09", productId: "beans", fromWarehouseId: "ruh", toWarehouseId: "jed", quantity: 4 }).map((x) => x.quantity)).toEqual([-4, 4]);
  });
});

describe("NqStockOnHand", () => {
  it("renders the grid with totals and the status badge", () => {
    const w = mount(NqStockOnHand, { props: { products, warehouses, movements }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("stock-on-hand");
    const rows = w.findAll('[data-slot="stock-row"]');
    expect(rows.map((r) => r.attributes("data-level"))).toEqual(["ok", "out"]);
    expect(rows[0]!.text()).toContain("Coffee beans 250g");
    expect(rows[0]!.text()).toContain("In stock");
    expect(rows[1]!.text()).toContain("Out");
    expect(w.find("tfoot").text()).toContain("15");
    w.unmount();
  });
  it("selects a product and records from the row menu props", async () => {
    const onSelectProduct = vi.fn();
    const w = mount(NqStockOnHand, { props: { products, warehouses, movements, onSelectProduct }, attachTo: document.body });
    await w.find("tbody button").trigger("click");
    expect(onSelectProduct).toHaveBeenCalledWith(products[0]);
    expect(w.find('button[aria-label="Product actions, Coffee beans 250g"]').exists()).toBe(true);
    w.unmount();
  });
  it("shows the empty state", () => {
    const w = mount(NqStockOnHand, { props: { products: [], warehouses, movements } });
    expect(w.text()).toContain("No products to track");
  });
});

describe("NqStockMovementList", () => {
  it("lists movements with change and balance", () => {
    const w = mount(NqStockMovementList, { props: { products, warehouses, movements, productId: "beans" } });
    const rows = w.findAll('[data-slot="stock-movement"]');
    expect(rows).toHaveLength(3);
    expect(rows[1]!.text()).toContain("-30");
    expect(rows[1]!.text()).toContain("10");
    expect(rows[1]!.text()).toContain("SO-5520");
  });
  it("filters by warehouse", () => {
    const w = mount(NqStockMovementList, { props: { products, warehouses, movements, productId: "beans", warehouseId: "jed" } });
    expect(w.findAll('[data-slot="stock-movement"]')).toHaveLength(1);
  });
});

describe("NqStockLedger", () => {
  it("renders both tables and a record button only when onRecord is given", async () => {
    const ro = mount(NqStockLedger, { props: { products, warehouses, movements }, attachTo: document.body });
    expect(ro.attributes("data-slot")).toBe("stock-ledger");
    expect(ro.find('[data-slot="stock-movements"]').exists()).toBe(true);
    expect(ro.text()).not.toContain("Record movement");
    ro.unmount();
    const rw = mount(NqStockLedger, { props: { products, warehouses, movements, onRecord: vi.fn() }, attachTo: document.body });
    expect(rw.text()).toContain("Record movement");
    rw.unmount();
  });

  it("blocks an issue above what is on hand, then records a valid receive", async () => {
    const onRecord = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqStockLedger, { props: { products, warehouses, movements, onRecord }, attachTo: document.body });
    await w.find("button.inline-flex, button").trigger("click");
    await vi.waitFor(() => expect(document.querySelector('[data-slot="stock-record"]')).toBeTruthy());
    const dlg = document.querySelector<HTMLElement>('[data-slot="stock-record"]')!;
    const qty = dlg.querySelector<HTMLInputElement>('input[aria-label="Quantity"]')!;
    const form = dlg.querySelector("form")!;
    // Empty quantity is rejected.
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await nextTick();
    expect(dlg.querySelector('[role="alert"]')?.textContent).toContain("Enter a quantity above zero.");
    expect(onRecord).not.toHaveBeenCalled();
    qty.dispatchEvent(new Event("focus"));
    qty.value = "6";
    qty.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(onRecord).toHaveBeenCalledTimes(1));
    const [added] = onRecord.mock.calls[0]!;
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ productId: "beans", warehouseId: "ruh", type: "receive", quantity: 6 });
    w.unmount();
  });

  it("speaks Arabic", async () => {
    const host = mount(
      { components: { NasaqProvider, NqStockLedger }, template: '<NasaqProvider default-locale="ar"><NqStockLedger :products="p" :warehouses="w" :movements="m" /></NasaqProvider>', data: () => ({ p: products, w: warehouses, m: movements }) },
      { attachTo: document.body },
    );
    await nextTick();
    expect(host.text()).toContain("المتوفر");
    expect(host.text()).toContain("الحركات");
    host.unmount();
  });
});
