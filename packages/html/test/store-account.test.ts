// The Blade store-account example (packages/php/examples/rendered/store-account.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { storeAccount } from "../src/alpine/store-account";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // The generated index adds the module; registering it here keeps the test independent of the coordinator's gen-index.
  storeAccount(Alpine as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
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
  host.innerHTML = rendered("store-account");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement, slot: string) => Alpine.$data(h.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!) as any;
const root = (h: HTMLElement, slot: string) => h.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
const listen = (el: HTMLElement, name: string) => {
  const seen: Array<Record<string, unknown>> = [];
  el.addEventListener(name, (e) => seen.push((e as CustomEvent).detail ?? {}));
  return seen;
};

describe("store-account (Alpine)", () => {
  it("renders the nav and navigates", async () => {
    const h = await mount();
    const nav = root(h, "store-account-nav");
    const buttons = nav.querySelectorAll("button");
    expect(buttons).toHaveLength(5);
    expect(buttons[0]!.getAttribute("aria-current")).toBe("page");
    const seen = listen(nav, "nq-navigate");
    buttons[2]!.click();
    expect(seen[0]).toEqual({ section: "wishlist" });
  });

  it("lists the orders in USD, filters and searches", async () => {
    const h = await mount();
    const el = root(h, "store-order-history");
    expect(el.textContent).toContain("#1044");
    expect(el.textContent).toContain("$47.00");
    const d = data(h, "store-order-history");
    expect(d.shown.map((o: { number: string }) => o.number)).toEqual(["#1044", "#1040"]);
    d.picked = ["delivered"];
    await tick();
    expect(d.shown.map((o: { number: string }) => o.number)).toEqual(["#1040"]);
    d.picked = ["all"];
    d.query = "zzz";
    await tick();
    expect(d.noMatch).toBe(true);
    d.clear();
    await tick();
    expect(d.shown).toHaveLength(2);
  });

  it("order again shows what was added and reduced, and tells the page", async () => {
    const h = await mount();
    const el = root(h, "store-order-history");
    const seen = listen(el, "nq-reorder");
    const d = data(h, "store-order-history");
    d.reorder(d.orders[0]);
    await tick();
    expect(seen).toHaveLength(1);
    expect(el.querySelector('[data-slot="store-reorder-notice"]')!.textContent).toContain("added to your cart");
    expect(d.notice.skipped).toEqual([{ lineId: "b", reason: "out" }]);
    expect(el.querySelector('[data-slot="store-reorder-notice"]')!.textContent).toContain("no longer available");
  });

  it("the account order has its timeline, items, totals and a return button", async () => {
    const h = await mount();
    const el = root(h, "store-account-order");
    expect(el.textContent).toContain("#1040");
    expect(el.textContent).toContain("Coffee beans 250g");
    expect(el.textContent).toContain("$47.00");
    expect(el.textContent).toContain("RMA-1001");
    const d = data(h, "store-account-order");
    expect(d.canReturn).toBe(true);
    expect(d.win.daysLeft).toBeGreaterThan(0);
    const seen = listen(el, "nq-return");
    d.startReturn();
    expect(seen).toHaveLength(1);
  });

  it("the return request prices the refund and validates before it submits", async () => {
    const h = await mount();
    const el = root(h, "store-return-request");
    const d = data(h, "store-return-request");
    const seen = listen(el, "nq-return-submit");
    d.submit();
    expect(seen).toHaveLength(0);
    expect(d.has("empty")).toBe(true);
    d.set("a", 2, 2);
    d.reason = "changed-mind";
    await tick();
    expect(d.plan.ok).toBe(true);
    expect(d.estimate).toBe("$36.00");
    d.submit();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.submission).toMatchObject({ orderId: "o1", reason: "changed-mind", refundMethod: "original", refundAmount: 3600 });
  });

  it("a damaged item asks for a photo", async () => {
    const h = await mount();
    const d = data(h, "store-return-request");
    d.set("a", 1, 2);
    d.reason = "defective";
    d.tried = true;
    await tick();
    expect(d.has("photos")).toBe(true);
    expect(d.photoHint).toContain("photo");
  });

  it("the return status shows the steps and cancels after confirmation", async () => {
    const h = await mount();
    const el = root(h, "store-return-status");
    const d = data(h, "store-return-status");
    expect(d.steps.map((s: { state: string }) => s.state)).toEqual(["done", "current", "upcoming", "upcoming", "upcoming"]);
    expect(el.textContent).toContain("RMA-1001");
    const seen = listen(el, "nq-cancel-return");
    d.cancel();
    expect(seen[0]!.request).toMatchObject({ id: "r1" });
  });

  it("the wishlist reads availability, toggles notify and removes", async () => {
    const h = await mount();
    const el = root(h, "store-wishlist");
    const d = data(h, "store-wishlist");
    expect(d.entries.map((e: { availability: string }) => e.availability)).toEqual(["in-stock", "out", "low"]);
    expect(el.textContent).toContain("Price dropped");
    const moved = listen(el, "nq-move-to-cart");
    d.moveToCart(d.entries[0]);
    expect(moved).toHaveLength(1);
    d.notify(d.entries[1]);
    await tick();
    expect(d.items.find((i: { id: string }) => i.id === "w2").notify).toBe(true);
    d.remove(d.entries[0]);
    await tick();
    expect(d.entries).toHaveLength(2);
  });

  it("the address book validates, edits, sets the default and deletes", async () => {
    const h = await mount();
    const el = root(h, "store-address-book");
    const d = data(h, "store-address-book");
    const seen = listen(el, "nq-address-change");
    d.openNew();
    d.save();
    expect(seen).toHaveLength(0);
    expect(d.errs.name).toBe("This field is required.");
    Object.assign(d.draft, { name: "Lina", phone: "+966 50 000 1111", line1: "1 Main St", city: "Dammam", country: "SA" });
    d.save();
    expect(d.addresses).toHaveLength(3);
    expect(seen).toHaveLength(1);
    d.makeDefault(d.addresses[1]);
    expect(d.addresses.map((a: { isDefault?: boolean }) => !!a.isDefault)).toEqual([false, true, false]);
    d.askDelete(d.addresses[2]);
    d.confirmDelete();
    expect(d.addresses).toHaveLength(2);
    expect(d.countryName("SA")).toBeTruthy();
  });

  it("recently viewed skips archived products, removes and clears", async () => {
    const h = await mount();
    const el = root(h, "store-recently-viewed");
    const d = data(h, "store-recently-viewed");
    expect(d.shown.map((p: { id: string }) => p.id)).toEqual(["p-c", "p-d", "p-a"]);
    const cleared = listen(el, "nq-clear");
    d.remove(d.shown[0]);
    expect(d.shown).toHaveLength(2);
    d.clearAll();
    expect(cleared).toHaveLength(1);
    expect(d.shown).toHaveLength(0);
  });
});
