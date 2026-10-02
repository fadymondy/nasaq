// The Blade store-orders-admin example (packages/php/examples/rendered/store-orders-admin.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  // The barcode would load jsbarcode from a CDN; a stub keeps the test offline.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).JsBarcode = () => undefined;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("store-orders-admin");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement, slot: string) => Alpine.$data(h.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!) as any;

describe("store-orders-admin (Alpine)", () => {
  it("lists the orders with status chips and money in USD", async () => {
    const h = await mount();
    const rows = [...h.querySelectorAll<HTMLElement>('[data-slot="store-order-row"]')];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("#1042");
    expect(rows[0]!.textContent).toContain("Mona Salem");
    expect(rows[0]!.textContent).toContain("$47.00");
  });

  it("filters by search and sorts", async () => {
    const h = await mount();
    const d = data(h, "store-orders-list");
    d.query = "omar";
    await tick();
    expect(d.filtered.map((o: { number: string }) => o.number)).toEqual(["#1041"]);
    d.query = "";
    d.sortBy("total");
    await tick();
    expect(d.sorted.length).toBe(2);
  });

  it("selects rows and marks the eligible ones fulfilled", async () => {
    const h = await mount();
    const d = data(h, "store-orders-list");
    d.toggleAll(true);
    await tick();
    expect(d.selected.length).toBe(2);
    expect(d.eligible.map((o: { number: string }) => o.number)).toEqual(["#1042", "#1041"]);
    d.markFulfilled(d.eligible);
    await tick();
    expect(d.orders.find((o: { number: string }) => o.number === "#1042").lines.every((l: { fulfilled?: number; quantity: number }) => l.fulfilled === l.quantity)).toBe(true);
  });

  it("ships part of an order from the detail and records it on the timeline", async () => {
    const h = await mount();
    const d = data(h, "store-order-detail");
    d.openFulfil();
    d.fqty.l1 = 1;
    d.fqty.l2 = 0;
    d.carrier = "Aramex";
    d.trackNo = "BST1";
    await tick();
    expect(d.fOk).toBe(true);
    d.confirmFulfil();
    await tick();
    expect(d.order.lines[0].fulfilled).toBe(1);
    expect(d.order.tracking.number).toBe("BST1");
    expect(d.events[0].label).toBeTruthy();
    expect(d.fulfilOpen).toBe(false);
  });

  it("refunds a line and keeps the remaining amount right", async () => {
    const h = await mount();
    const d = data(h, "store-order-detail");
    d.openRefund();
    d.rqty.l2 = 1;
    await tick();
    expect(d.rTotal).toBe(600);
    d.confirmRefund();
    await tick();
    expect(d.refunds).toHaveLength(1);
    expect(d.remaining).toBe(4100);
    expect(d.refundOpen).toBe(false);
  });

  it("cancels the order and refunds it in full", async () => {
    const h = await mount();
    const d = data(h, "store-order-detail");
    expect(d.cancellable).toBe(true);
    d.confirmCancel();
    await tick();
    expect(d.order.status).toBe("cancelled");
    expect(d.refunds.reduce((s: number, r: { amount: number }) => s + r.amount, 0)).toBe(4700);
  });

  it("adds a note and dispatches nq-order-change", async () => {
    const h = await mount();
    const root = h.querySelector<HTMLElement>('[data-slot="store-order-detail"]')!;
    let detail: { order: { number: string } } | undefined;
    root.addEventListener("nq-order-change", (e) => (detail = (e as CustomEvent).detail));
    const d = data(h, "store-order-detail");
    d.note = "Call before delivery";
    d.addNote();
    await tick();
    expect(d.events.some((e: { note?: string }) => e.note === "Call before delivery")).toBe(true);
    expect(detail?.order.number).toBe("#1042");
    expect(d.note).toBe("");
  });

  it("prices abandoned carts and gates the recovery email", async () => {
    const h = await mount();
    const d = data(h, "store-abandoned-carts");
    expect(d.stats.carts).toBe(2);
    expect(d.atRisk).toBe("$42.00");
    const byId = Object.fromEntries(d.rows.map((r: { id: string }) => [r.id, r]));
    expect(byId.c1.gate.ok).toBe(true);
    expect(byId.c2.gate.ok).toBe(false);
    expect(byId.c2.why).toBeTruthy();
  });

  it("sends a recovery email with a discount, cancelable by the page", async () => {
    const h = await mount();
    const root = h.querySelector<HTMLElement>('[data-slot="store-abandoned-carts"]')!;
    const seen: unknown[] = [];
    root.addEventListener("nq-send-recovery", (e) => seen.push((e as CustomEvent).detail));
    const d = data(h, "store-abandoned-carts");
    d.open(d.carts[0]);
    d.percent = 50;
    d.message = " Come back ";
    expect(d.pct).toBe(20);
    d.send();
    await tick();
    expect(seen).toEqual([{ cartId: "c1", discountPercent: 20, discountAmount: 720, message: "Come back" }]);
    expect(d.carts[0].emailsSent).toBe(1);
  });

  it("prints a packing slip without prices and an invoice with them", async () => {
    const h = await mount();
    const slip = h.querySelector<HTMLElement>('[data-slot="store-order-document"][data-kind="packing-slip"]')!;
    const invoice = h.querySelector<HTMLElement>('[data-slot="store-order-document"][data-kind="invoice"]')!;
    expect(slip.textContent).not.toContain("$18.00");
    expect(invoice.textContent).toContain("$18.00");
    expect(invoice.textContent).toContain("$47.00");
    const d = data(h, "store-order-print-view");
    expect(d.current).toBe("packing-slip");
    d.kind = ["invoice"];
    await tick();
    expect(d.current).toBe("invoice");
  });
});
