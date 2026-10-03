// The Blade stock-ledger example (packages/php/examples/rendered/stock-ledger.html) under real Alpine.
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
  host.innerHTML = rendered("stock-ledger");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement) => Alpine.$data(h.querySelector<HTMLElement>('[data-slot="stock-ledger"]')!) as any;

describe("stock-ledger (Alpine)", () => {
  it("renders the grid with levels and totals", async () => {
    const h = await mount();
    const rows = [...h.querySelectorAll<HTMLElement>('[data-slot="stock-row"]')];
    expect(rows.map((r) => r.dataset.level)).toEqual(["ok", "low"]);
    expect(rows[0]!.textContent).toContain("Coffee beans 250g");
    expect(h.querySelector("[role=rowgroup]:last-child")!.textContent).toContain("45");
    expect(h.querySelectorAll('[data-slot="stock-movement"]')).toHaveLength(3);
  });

  it("selecting a product switches the movement list and keeps a running balance", async () => {
    const h = await mount();
    data(h).select("filter");
    await tick();
    const rows = h.querySelectorAll('[data-slot="stock-movement"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.textContent).toContain("PO-2044");
    expect(data(h).statement[0].balance).toBe(3);
  });

  it("rejects an issue above what is on hand, then records a receive locally", async () => {
    const h = await mount();
    const d = data(h);
    d.openRecord("issue", "beans");
    d.qty = 99000;
    await d.submit();
    expect(d.dialogOpen).toBe(true);
    expect(d.shownError).toContain("only 32");
    d.kind = ["receive"];
    d.qty = 6000;
    await d.submit();
    expect(d.dialogOpen).toBe(false);
    expect(d.movements.at(-1)).toMatchObject({ productId: "beans", warehouseId: "ruh", type: "receive", quantity: 6 });
  });

  it("fires nq-stock-record, stays busy while claimed and keeps the dialog open on rejection", async () => {
    const h = await mount();
    const d = data(h);
    let seen: unknown[] = [];
    h.addEventListener("nq-stock-record", (e) => {
      const detail = (e as CustomEvent).detail;
      seen = detail.movements;
      detail.waitUntil(new Promise((_, rej) => setTimeout(() => rej(new Error("no")), 30)));
    });
    d.openRecord("transfer", "beans");
    d.formTo = "jed";
    d.qty = 2000;
    const p = d.submit();
    expect(d.busy).toBe(true);
    await p;
    expect(seen).toHaveLength(2);
    expect(d.dialogOpen).toBe(true);
    expect(d.failed).toBeTruthy();
    expect(d.movements).toHaveLength(4);
  });
});
