// The Blade invoice-list example (packages/php/examples/rendered/invoice-list.html) under real Alpine.
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
  host.innerHTML = rendered("invoice-list");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (h: HTMLElement) => Alpine.$data(h.querySelector<HTMLElement>('[data-slot="data-table"]')!) as any;
const rowNumbers = (h: HTMLElement) => [...h.querySelectorAll<HTMLElement>("[data-row]")].map((r) => r.querySelector("[data-cell-col=number]")!.textContent!.trim());

describe("invoice-list (Alpine)", () => {
  it("renders the tiles with USD totals and the rows newest first", async () => {
    const h = await mount();
    expect(h.querySelector('[data-slot="invoice-list"]')).toBeTruthy();
    const tiles = [...h.querySelectorAll('[data-slot="stat-card-value"]')].map((e) => e.textContent!.trim());
    expect(tiles).toEqual(["$281.75", "$0.00", "$281.75"]);
    expect(rowNumbers(h)).toEqual(["INV-2026-0042", "INV-2026-0037"]);
    expect(h.querySelector("[data-cell-col=amount]")!.textContent).toContain("$281.75");
  });

  it("opens an invoice from the View action and from a row click", async () => {
    const h = await mount();
    const seen: string[] = [];
    h.addEventListener("nq-invoice-open", ((e: CustomEvent) => seen.push(e.detail.invoice.number)) as unknown as EventListener);
    table(h).act("view", table(h).pageRows[0]);
    expect(seen).toEqual(["INV-2026-0042"]);
    h.querySelector<HTMLElement>("[data-row]")!.click();
    await tick();
    expect(seen).toEqual(["INV-2026-0042", "INV-2026-0042"]);
  });

  it("pays only open and overdue invoices", async () => {
    const h = await mount();
    const seen: string[] = [];
    h.addEventListener("nq-invoice-pay", ((e: CustomEvent) => seen.push(e.detail.invoice.number)) as unknown as EventListener);
    table(h).act("pay", table(h).pageRows[1]);
    table(h).act("pay", table(h).pageRows[0]);
    expect(seen).toEqual(["INV-2026-0042"]);
  });

  it("download: an unclaimed event finishes at once, a rejected waitUntil shows the message", async () => {
    const h = await mount();
    const root = h.querySelector<HTMLElement>('[data-slot="invoice-list"]')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root) as any;
    table(h).act("download", table(h).pageRows[0]);
    await tick();
    expect(data.downloading).toBeNull();
    expect(data.failed).toBe("");

    h.addEventListener("nq-invoice-download", ((e: CustomEvent) => e.detail.waitUntil(new Promise((_, rej) => setTimeout(() => rej(new Error("Disk full")), 120)))) as unknown as EventListener);
    table(h).act("download", table(h).pageRows[0]);
    await tick();
    expect(data.downloading).toBe("1");
    await tick(150);
    expect(data.downloading).toBeNull();
    expect(root.querySelector<HTMLElement>('[role="alert"]')!.textContent).toBe("Disk full");
  });
});
