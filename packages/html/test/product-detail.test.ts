// product-detail: the Blade example, server-rendered, run under real Alpine. The buy box, variant picker, quantity stepper and
// gallery come alive; add to cart is a bubbling "nq-add-to-cart" event with the variant and the quantity.
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
  host.innerHTML = rendered("product-detail");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const root = host.querySelector<HTMLElement>('[data-slot="product-detail"]')!;
  const radio = (option: string, value: string) =>
    [...root.querySelectorAll<HTMLElement>(`[data-option="${option}"] [role="radio"]`)].find((el) => el.getAttribute("aria-label")?.startsWith(value))!;
  const add = () => [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => /^(Add to cart|Sold out)$/.test(b.textContent!.trim()))!;
  const stock = () => root.querySelector('[x-text="stockText"]')!.textContent;
  return { host, root, radio, add, stock };
}

describe("product-detail (Blade example)", () => {
  it("server-renders the buy box for the first variant in stock", async () => {
    const { root, radio, add } = await mount();
    expect(root.querySelector("h1")?.textContent).toBe("Everyday tee");
    expect(root.textContent).toContain("$29");
    expect(radio("size", "S").getAttribute("aria-checked")).toBe("true");
    expect(radio("size", "S").hasAttribute("data-checked")).toBe(true);
    expect(radio("size", "L").getAttribute("data-availability")).toBe("out");
    expect(radio("size", "L").getAttribute("aria-label")).toBe("L, Sold out");
    expect(add().textContent!.trim()).toBe("Add to cart");
    expect(root.textContent).toContain("Tracked shipping across Egypt.");
    expect(root.textContent).not.toContain("Buy now");
  });

  it("picks a variant: updates the checked radio, the price, the stock line and emits nq-variant-change", async () => {
    const { host, root, radio, stock } = await mount();
    let detail: { variantId: string | null } | undefined;
    host.addEventListener("nq-variant-change", (e) => (detail = (e as CustomEvent).detail));
    radio("color", "Sand").click();
    await tick();
    expect(radio("color", "Sand").hasAttribute("data-checked")).toBe(true);
    expect(radio("color", "Black").hasAttribute("data-checked")).toBe(false);
    expect(detail?.variantId).toBe("sand-s");
    expect(root.querySelector('[x-text="compareText"]')?.textContent).toBe("$39");
    expect(root.querySelector('[x-text="percentText"]')?.textContent).toContain("off");
    radio("size", "M").click();
    await tick();
    expect(detail?.variantId).toBe("sand-m");
    expect(stock()).toBe("Only 5 left in stock");
  });

  it("disables Add to cart for a sold-out variant", async () => {
    const { radio, add, stock } = await mount();
    radio("color", "Black").click();
    radio("size", "L").click();
    await tick();
    expect(stock()).toBe("Out of stock");
    expect(add().textContent!.trim()).toBe("Sold out");
    expect(add().disabled).toBe(true);
  });

  it("steps the quantity within stock", async () => {
    const { root, radio } = await mount();
    radio("size", "M").click(); // black-m: 3 in stock
    await tick();
    const q = root.querySelector<HTMLElement>('[data-slot="product-quantity"]')!;
    const input = q.querySelector<HTMLInputElement>("input")!;
    const [minus, plus] = [...q.querySelectorAll<HTMLButtonElement>("button")];
    expect(input.value).toBe("1");
    expect(minus!.disabled).toBe(true);
    plus!.click();
    plus!.click();
    plus!.click();
    await tick();
    expect(input.value).toBe("3");
    expect(plus!.disabled).toBe(true);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await tick();
    expect(input.value).toBe("2");
    input.value = "9";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(input.value).toBe("3");
    expect(q.textContent).toContain("Only 3 available");
  });

  it("dispatches nq-add-to-cart with the variant and quantity, and says so", async () => {
    const { host, root, add } = await mount();
    let detail: { variantId: string; quantity: number } | undefined;
    host.addEventListener("nq-add-to-cart", (e) => (detail = (e as CustomEvent).detail));
    root.querySelector<HTMLButtonElement>('[data-slot="product-quantity"] button:last-of-type')!.click();
    await tick();
    add().click();
    await tick();
    expect(detail).toMatchObject({ variantId: "black-s", quantity: 2 });
    expect(root.querySelector("p[id^='nq-pdp-status']")?.textContent).toContain("Added to cart");
  });

  it("shows the failure a handler passes to wait()", async () => {
    const { host, root, add } = await mount();
    host.addEventListener("nq-add-to-cart", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Out of reach" })));
    add().click();
    await tick();
    const status = root.querySelector("p[id^='nq-pdp-status']")!;
    expect(status.getAttribute("role")).toBe("alert");
    expect(status.textContent).toContain("Out of reach");
  });

  it("steps the gallery with the buttons and the arrow keys", async () => {
    const { root } = await mount();
    const gallery = root.querySelector<HTMLElement>('[data-slot="product-gallery"]')!;
    const stage = gallery.querySelector<HTMLElement>('[data-slot="product-gallery-stage"]')!;
    const img = () => stage.querySelector("img")!.getAttribute("src");
    expect(img()).toContain("tee-1");
    gallery.querySelector<HTMLButtonElement>('button[aria-label="Next image"]')!.click();
    await tick();
    expect(img()).toContain("tee-2");
    expect(gallery.querySelector("[aria-live='polite']")?.textContent).toBe("Image 2 of 2");
    stage.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await tick();
    expect(img()).toContain("tee-1");
    expect(gallery.querySelector('[data-slot="product-gallery-thumbs"] button')!.getAttribute("aria-current")).toBe("true");
  });

  it("shows a placeholder when the image fails to load", async () => {
    const { root } = await mount();
    const stage = root.querySelector<HTMLElement>('[data-slot="product-gallery-stage"]')!;
    stage.querySelector("img")!.dispatchEvent(new Event("error"));
    await tick();
    expect((stage.querySelector('[role="img"]') as HTMLElement).style.display).not.toBe("none");
  });
});
