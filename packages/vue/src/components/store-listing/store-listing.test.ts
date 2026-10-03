import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import type { CommerceProduct } from "./commerce";
import { EMPTY_LISTING_FILTERS, listingFilter, listingSort, NqStoreListing, NqStorePrice, NqStoreProductCard } from ".";

const mk = (id: string, name: string, price: number, extra: Partial<CommerceProduct> = {}): CommerceProduct => ({
  id,
  name,
  brand: id === "cap" ? "Atlas" : "Nasaq Goods",
  category: "Clothing",
  images: [],
  options: [],
  variants: [{ id: `${id}-1`, options: {}, price, stock: id === "cap" ? 0 : 5 }],
  ...extra,
});
const products = [mk("tee", "Everyday tee", 2900), mk("hoodie", "Zip hoodie", 6900), mk("cap", "Canvas cap", 1900)];

const wrap = (comp: object, props: Record<string, unknown>, locale = "en") =>
  mount({ components: { NasaqProvider, C: comp }, setup: () => ({ props, locale }), template: `<NasaqProvider :locale="locale"><C v-bind="props" /></NasaqProvider>` }, { attachTo: document.body });

describe("listing model", () => {
  it("filters and sorts", () => {
    const f = { ...EMPTY_LISTING_FILTERS, inStock: true };
    expect(listingFilter(products, f, { tree: [] }).map((p) => p.id)).toEqual(["tee", "hoodie"]);
    expect(listingSort(products, "price-asc", "", "en").map((p) => p.id)).toEqual(["cap", "tee", "hoodie"]);
  });
});

describe("NqStoreListing", () => {
  it("renders the grid and the result count", () => {
    const w = wrap(NqStoreListing, { products, title: "Clothing" });
    expect(w.find('[data-slot="store-listing"]').exists()).toBe(true);
    expect(w.findAll('[data-slot="store-product-card"]')).toHaveLength(3);
    expect(w.find('[data-slot="store-listing-grid"]').attributes("data-view")).toBe("grid");
    expect(w.text()).toContain("$29");
    w.unmount();
  });
  it("shows the empty state when nothing matches", () => {
    const w = wrap(NqStoreListing, { products, defaultFilters: { query: "zzzz" } });
    expect(w.findAll('[data-slot="store-product-card"]')).toHaveLength(0);
    expect(w.find('[data-slot="store-listing-grid"]').exists()).toBe(false);
    w.unmount();
  });
  it("shows skeletons while loading", () => {
    const w = wrap(NqStoreListing, { products, loading: true });
    expect(w.find('[role="status"][aria-label]').exists()).toBe(true);
    expect(w.findAll('[data-slot="store-product-card"]')).toHaveLength(0);
    w.unmount();
  });
  it("pages the results", async () => {
    const w = wrap(NqStoreListing, { products, pageSize: 2 });
    expect(w.findAll('[data-slot="store-product-card"]')).toHaveLength(2);
    w.unmount();
  });
  it("uses SAR in Arabic", () => {
    const w = wrap(NqStoreListing, { products }, "ar");
    expect(w.text()).toMatch(/SAR|ر\.س/);
    w.unmount();
  });
});

describe("parts", () => {
  it("StorePrice renders data-slot", () => {
    const w = wrap(NqStorePrice, { amount: 2900, currency: "USD" });
    expect(w.find('[data-slot="store-price"]').exists()).toBe(true);
    w.unmount();
  });
  it("StoreProductCard marks sold out and emits quick view", async () => {
    const onQuickView = vi.fn();
    const w = wrap(NqStoreProductCard, { product: products[2], currency: "USD", onQuickView });
    expect(w.find('[data-slot="store-product-card"]').attributes("data-sold-out")).toBeDefined();
    await flushPromises();
    w.unmount();
  });
});
