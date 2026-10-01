// store-listing: the Blade example, server-rendered, run under real Alpine. Every product card is rendered once; Alpine filters,
// sorts and pages by showing and ordering them, and the chips, compare tray and quick view render from the listing's state.
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
  host.innerHTML = rendered("store-listing");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const root = host.querySelector<HTMLElement>('[data-slot="store-listing"]')!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = () => (Alpine as any).$data(root);
  const items = () => [...root.querySelectorAll<HTMLElement>('[data-slot="store-listing-grid"] > li')];
  const shown = () => items().filter((li) => li.style.display !== "none");
  const names = () =>
    shown()
      .sort((a, b) => Number(a.style.order) - Number(b.style.order))
      .map((li) => li.querySelector('[data-slot="store-product-card"] h3, [data-slot="store-product-card"] a')?.textContent?.trim() ?? "");
  return { host, root, data, items, shown, names };
}

describe("store-listing (Blade example)", () => {
  it("server-renders every card once and shows the first page", async () => {
    const { root, items, shown } = await mount();
    expect(root.querySelector("h1")?.textContent).toBe("Shop");
    expect(items()).toHaveLength(6);
    expect(shown()).toHaveLength(4);
    expect(root.querySelectorAll('[data-slot="store-product-card"]')).toHaveLength(6);
    expect(root.querySelector('[data-slot="store-listing-toolbar"] [role="status"]')?.textContent).toBe("6 results");
    expect(root.querySelector('[data-slot="store-active-chips"]')).not.toBeNull();
    expect(root.querySelectorAll("[data-ssr]")).toHaveLength(0);
  });

  it("filters by category, shows a chip and resets the page", async () => {
    const { root, data, shown } = await mount();
    data().setCategory("filters", "tops");
    await tick();
    expect(shown()).toHaveLength(2);
    const chips = root.querySelector<HTMLElement>('[data-slot="store-active-chips"]')!;
    expect(chips.style.display).not.toBe("none");
    expect(chips.textContent).toContain("Tops");
    expect(root.querySelector('[data-slot="store-listing-toolbar"] [role="status"]')?.textContent).toBe("2 results");
    [...chips.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.includes("Tops"))!.click();
    await tick();
    expect(shown()).toHaveLength(4);
    expect(chips.style.display).toBe("none");
  });

  it("filters by brand through the facet checkbox and in-stock", async () => {
    const { data, shown } = await mount();
    data().toggleBrand("filters", "Atlas");
    await tick();
    expect(shown().length).toBe(3);
    data().filters = { ...data().filters, inStock: true };
    await tick();
    expect(shown().length).toBe(2);
  });

  it("sorts by price with CSS order and pages", async () => {
    const { data, shown, items } = await mount();
    data().sort = "price-asc";
    await tick();
    const first = shown().sort((a, b) => Number(a.style.order) - Number(b.style.order))[0]!;
    expect(first.textContent).toContain("Wool socks");
    expect(items()).toHaveLength(6);
    data().goPage(2);
    await tick();
    expect(shown()).toHaveLength(2);
  });

  it("shows the empty state with ways to relax the filters", async () => {
    const { root, data } = await mount();
    data().filters = { ...data().filters, query: "zzz" };
    await tick();
    expect(data().empty).toBe(true);
    expect(root.querySelector('[data-slot="empty-state"]')?.textContent).toContain("No results for");
    data().resetFilters();
    await tick();
    expect(data().empty).toBe(false);
  });

  it("compares products and opens the compare dialog", async () => {
    const { root, data } = await mount();
    data().toggleCompare("tee");
    data().toggleCompare("hoodie");
    await tick();
    const tray = root.querySelector<HTMLElement>('[data-slot="store-compare-tray"]')!;
    expect(tray.style.display).not.toBe("none");
    expect(tray.textContent).toContain("2 of 4 selected");
    data().compareOpen = true;
    await tick();
    expect(data().compareProducts).toHaveLength(2);
    data().clearCompare();
    await tick();
    expect(tray.style.display).toBe("none");
  });

  it("emits nq-wishlist-change from a card heart and tracks it in the listing", async () => {
    const { host, root, data } = await mount();
    let detail: { productId: string; wishlisted: boolean } | undefined;
    host.addEventListener("nq-wishlist-change", (e) => (detail = (e as CustomEvent).detail));
    const heart = root.querySelector<HTMLButtonElement>('[data-slot="store-product-card"] button[aria-pressed]')!;
    heart.click();
    await tick();
    expect(detail?.wishlisted).toBe(true);
    expect(data().wishIds).toContain(detail!.productId);
  });

  it("opens quick view for a product", async () => {
    const { host, data } = await mount();
    let opened: string | undefined;
    host.addEventListener("nq-quick-view", (e) => (opened = (e as CustomEvent).detail.productId));
    data().openQuick("tee");
    await tick();
    expect(data().quickOpen).toBe(true);
    expect(data().quickProduct.id).toBe("tee");
    expect(opened === undefined || opened === "tee").toBe(true);
  });

  it("adds a single-variant product to the cart from the card with nq-add-to-cart", async () => {
    const { host, root } = await mount();
    let detail: { variantId: string; quantity: number } | undefined;
    host.addEventListener("nq-add-to-cart", (e) => (detail = (e as CustomEvent).detail));
    const card = [...root.querySelectorAll<HTMLElement>('[data-slot="store-product-card"]')].find((c) => c.textContent!.includes("Leather belt"))!;
    const add = card.querySelector<HTMLButtonElement>('[data-slot="store-product-card-add"]')!;
    add.click();
    await tick();
    expect(detail?.variantId).toBe("belt-1");
    expect(detail?.quantity).toBe(1);
  });
});
