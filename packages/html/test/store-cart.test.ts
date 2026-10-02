// store-cart: the Blade example, server-rendered, run under real Alpine. The cart is worked out in the browser; every callback is a bubbling event.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 80) => new Promise((r) => setTimeout(r, ms));

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
  host.innerHTML = rendered("store-cart");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const page = host.querySelector<HTMLElement>('[data-slot="store-cart-page"]')!;
  const lines = () => [...page.querySelectorAll<HTMLElement>('[data-slot="store-cart-line"]')];
  const text = () => page.textContent!.replace(/\s+/g, " ");
  const events: Record<string, unknown[]> = {};
  for (const n of ["quantity", "remove", "undo", "save", "move", "checkout", "change"]) {
    host.addEventListener(`store-cart-${n}`, (e) => (events[n] ||= []).push((e as CustomEvent).detail));
  }
  return { host, page, lines, text, events };
}

describe("store-cart (Blade example)", () => {
  it("draws the lines, totals and the money in USD", async () => {
    const { lines, text, page } = await mount();
    expect(lines()).toHaveLength(2);
    expect(text()).toContain("Everyday cotton tee");
    expect(text()).toContain("Steel water bottle");
    expect(page.querySelector('[data-slot="store-cart-summary"]')).toBeTruthy();
    expect(text()).toContain("$");
    expect(text()).not.toMatch(/EGP|₪/);
  });

  it("clamps the quantity at the line max and bubbles store-cart-quantity", async () => {
    const { lines, events, text } = await mount();
    const line = lines()[0]!;
    const plus = [...line.querySelectorAll<HTMLButtonElement>("button")].find((b) => /increase/i.test(b.getAttribute("aria-label") ?? ""))!;
    plus.click();
    await tick();
    expect(events.quantity?.[0]).toMatchObject({ lineId: "tee-black-m", quantity: 3 });
    expect(plus.disabled).toBe(true);
    expect(text()).toMatch(/Only 3 available/i);
  });

  it("removes with an undo bar and restores the line", async () => {
    const { page, lines, events } = await mount();
    const line = lines()[1]!;
    const remove = [...line.querySelectorAll<HTMLButtonElement>("button")].find((b) => /remove/i.test(b.getAttribute("aria-label") ?? ""))!;
    remove.click();
    await tick();
    expect(events.remove?.[0]).toMatchObject({ lineId: "bottle" });
    expect(lines()).toHaveLength(1);
    const bar = page.querySelector<HTMLElement>('[data-slot="store-cart-removed"]')!;
    expect(bar.style.display).not.toBe("none");
    [...bar.querySelectorAll("button")].find((b) => /undo/i.test(b.textContent!))!.click();
    await tick();
    expect(events.undo).toHaveLength(1);
    expect(lines()).toHaveLength(2);
  });

  it("checkout bubbles the lines and totals", async () => {
    const { page, events } = await mount();
    const btn = [...page.querySelectorAll<HTMLButtonElement>("button")].find((b) => /^Checkout$/.test(b.textContent!.trim()))!;
    btn.click();
    await tick();
    expect(events.checkout).toHaveLength(1);
    expect(events.checkout![0]).toHaveProperty("totals");
  });

  it("the free-shipping bar is not unlocked below the threshold", async () => {
    const { page } = await mount();
    const bar = page.querySelector<HTMLElement>('[data-slot="store-free-shipping"]')!;
    expect(bar).toBeTruthy();
    expect(bar.getAttribute("data-unlocked")).not.toBe("true");
  });

  it("the shipping estimator renders", async () => {
    const { page } = await mount();
    expect(page.querySelector('[data-slot="store-shipping-estimator"]')).toBeTruthy();
  });

  it("the cross-sell carousel renders its products", async () => {
    const { page } = await mount();
    const cs = page.querySelector('[data-slot="store-cross-sell"]')!;
    expect(cs.textContent).toContain("Canvas cap");
  });
});
