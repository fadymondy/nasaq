// The Blade pos-register example (packages/php/examples/rendered/pos-register.html) under real Alpine.
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
  host.innerHTML = rendered("pos-register");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement) => Alpine.$data(h.querySelector<HTMLElement>('[data-slot="pos-register"]')!) as any;

describe("pos-register (Alpine)", () => {
  it("renders the closed register and opens it with a float", async () => {
    const h = await mount();
    const root = h.querySelector<HTMLElement>('[data-slot="pos-register"]')!;
    expect(root.dataset.state).toBe("closed");
    expect(root.textContent).toContain("The register is closed");
    let session: unknown = null;
    root.addEventListener("nq-pos-session", (e) => (session = (e as CustomEvent).detail.session));
    data(h).floatMinor = 5000;
    data(h).openRegister();
    await tick();
    expect(data(h).session).not.toBeNull();
    expect(root.outerHTML.slice(0, 80)).toContain(`data-state="open"`); // happy-dom: getAttribute lags a bound attribute that also has a static value
    expect(session).toMatchObject({ cashier: "Lina", openingFloat: 5000 });
    expect(root.textContent).toContain("Espresso");
  });

  it("adds to the basket and totals it", async () => {
    const h = await mount();
    const d = data(h);
    d.floatMinor = 0;
    d.openRegister();
    await tick();
    d.add(d.products[0]);
    d.add(d.products[0]);
    await tick();
    expect(d.basket[0].quantity).toBe(2);
    expect(h.querySelectorAll('[data-slot="pos-line"]')).toHaveLength(1);
    expect(d.totals.total).toBeGreaterThan(0);
  });

  it("parks the basket and fires nq-pos-park", async () => {
    const h = await mount();
    const d = data(h);
    d.floatMinor = 0;
    d.openRegister();
    await tick();
    d.add(d.products[1]);
    let parked = 0;
    h.addEventListener("nq-pos-park", () => parked++);
    d.park();
    await tick();
    expect(parked).toBe(1);
    expect(d.basket).toHaveLength(0);
    expect(d.parked).toHaveLength(1);
  });

  it("charges cash, fires a claimable nq-pos-checkout and shows the receipt", async () => {
    const h = await mount();
    const d = data(h);
    d.floatMinor = 0;
    d.openRegister();
    await tick();
    d.add(d.products[1]);
    let sale: { number: string; method: string } | null = null;
    h.addEventListener("nq-pos-checkout", (e) => {
      const detail = (e as CustomEvent).detail;
      sale = detail.sale;
      detail.waitUntil(new Promise((r) => setTimeout(r, 20)));
    });
    d.paying = true;
    await tick();
    d.amount = d.due;
    await d.submitPay();
    await tick();
    expect(sale).toMatchObject({ number: "POS-1001", method: "cash" });
    expect(d.done.number).toBe("POS-1001");
    expect(d.basket).toHaveLength(0);
  });

  it("closes the drawer with a counted amount", async () => {
    const h = await mount();
    const d = data(h);
    d.floatMinor = 5000;
    d.openRegister();
    await tick();
    let report: { variance: number } | null = null;
    h.addEventListener("nq-pos-close", (e) => (report = (e as CustomEvent).detail.report));
    d.closing = true;
    d.counted = 4900;
    await d.submitClose();
    await tick();
    expect(report).toMatchObject({ variance: -100 });
    expect(h.querySelector<HTMLElement>('[data-slot="pos-register"]')!.dataset.state).toBe("closed");
  });
});
