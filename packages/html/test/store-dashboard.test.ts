// The Blade example (php/examples/store-dashboard.blade.php) mounted under real Alpine: the KPIs, the open and restock events and the context menu.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}


describe("store dashboard", () => {
  it("shows the five KPIs and the live card", async () => {
    const host = await mountHtml(rendered("store-dashboard"));
    const kpis = host.querySelector<HTMLElement>('[data-slot="store-dashboard-kpis"]')!;
    expect(kpis.querySelectorAll('[data-slot="stat-card"]')).toHaveLength(5);
    expect(kpis.textContent).toContain("$48,200");
    expect(kpis.querySelector('[data-slot="store-dashboard-live"]')!.textContent).toContain("74");
  });

  it("dispatches open-product and restock from the buttons", async () => {
    const host = await mountHtml(rendered("store-dashboard"));
    const seen: Array<[string, unknown]> = [];
    for (const n of ["nq-open-product", "nq-restock"]) host.addEventListener(n, (e) => seen.push([n, (e as CustomEvent).detail]));
    host.querySelector<HTMLElement>('[data-slot="store-dashboard-top-products"] button')!.click();
    host.querySelector<HTMLElement>('[data-slot="store-dashboard-low-stock"] button')!.click();
    await tick();
    expect(seen[0]).toEqual(["nq-open-product", { id: "p1" }]);
    expect(seen[1]![0]).toBe("nq-restock");
    expect((seen[1]![1] as { productId: string }).productId).toBe("p1");
  });

  it("opens the low-stock context menu and restocks from it", async () => {
    const host = await mountHtml(rendered("store-dashboard"));
    const seen: unknown[] = [];
    host.addEventListener("nq-restock", (e) => seen.push((e as CustomEvent).detail));
    const trigger = host.querySelector<HTMLElement>('[data-slot="store-dashboard-low-stock"] [data-slot="context-menu-trigger"]')!;
    trigger.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
    await tick(120);
    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) => i.textContent?.includes("Restock"));
    expect(item).toBeTruthy();
    item!.click();
    await tick();
    expect(seen).toHaveLength(1);
    expect((seen[0] as { variantId: string }).variantId).toBe("v2");
  });

  it("renders the recent orders newest first", async () => {
    const host = await mountHtml(rendered("store-dashboard"));
    const rows = [...host.querySelectorAll<HTMLElement>('[data-slot="data-table"] [data-slot="table-row"][data-row]')];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("#1042");
  });
});
