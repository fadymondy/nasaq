import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import type { CommerceProduct } from "./commerce";
import { NqProductDetail, NqProductGallery, NqProductQuantityStepper, NqProductSizeGuide, NqProductVariantPicker } from ".";
import { deliveryWindow, displayPrice, imageForSelection, initialSelection, resolveSwipe, stepIndex, stockState } from ".";

const product: CommerceProduct = {
  id: "tee",
  name: "Everyday tee",
  brand: "Nasaq Goods",
  description: "A soft cotton tee.",
  images: [
    { src: "/a.jpg", alt: "front" },
    { src: "/b.jpg", alt: "back" },
  ],
  options: [
    { id: "color", name: "Colour", display: "swatch", values: [{ id: "black", label: "Black", color: "#111" }, { id: "sand", label: "Sand", color: "#dcc" }] },
    { id: "size", name: "Size", values: [{ id: "s", label: "S" }, { id: "m", label: "M" }, { id: "l", label: "L" }] },
  ],
  variants: [
    { id: "black-s", options: { color: "black", size: "s" }, price: 2900, stock: 8 },
    { id: "black-m", options: { color: "black", size: "m" }, price: 2900, stock: 3 },
    { id: "black-l", options: { color: "black", size: "l" }, price: 2900, stock: 0 },
    { id: "sand-s", options: { color: "sand", size: "s" }, price: 2900, compareAt: 3900, stock: 12 },
  ],
  rating: { average: 4.6, count: 128 },
};

describe("pdp logic", () => {
  it("opens on the first variant in stock", () => {
    expect(initialSelection(product)).toEqual({ color: "black", size: "s" });
    expect(initialSelection(product, { blank: true })).toEqual({});
  });
  it("reads price, stock, swipe, step and delivery", () => {
    expect(displayPrice(product, product.variants[3]).percentOff).toBeGreaterThan(0);
    expect(stockState(product.variants[2]).kind).toBe("out");
    expect(stockState(product.variants[1]).kind).toBe("low");
    expect(stepIndex(0, -1, 3)).toBe(2);
    expect(resolveSwipe(-80, 0)).toBe("next");
    expect(resolveSwipe(-80, 0, { rtl: true })).toBe("prev");
    expect(imageForSelection(product, {}, undefined)).toBeUndefined();
    const w = deliveryWindow("2026-01-05T08:00:00Z", [1, 2], { skipWeekdays: [5, 6] });
    expect(String(w.from) <= String(w.to)).toBe(true);
  });
});

describe("NqProductQuantityStepper", () => {
  it("steps within max and shows the limit", async () => {
    const w = mount(NqProductQuantityStepper, { props: { modelValue: 2, max: 3 } });
    expect(w.attributes("data-slot")).toBe("product-quantity");
    const buttons = w.findAll("button");
    await buttons[1]!.trigger("click");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([3]);
    await w.setProps({ modelValue: 3 });
    expect(buttons[1]!.attributes("disabled")).toBeDefined();
  });
});

describe("NqProductVariantPicker", () => {
  it("marks availability and emits a reconciled selection", async () => {
    const w = mount(NqProductVariantPicker, { props: { product, modelValue: { color: "black", size: "s" } }, attachTo: document.body });
    const sizes = w.findAll('[data-option="size"] [role="radio"]');
    expect(sizes.length).toBe(3);
    expect(sizes[0]!.attributes("data-checked")).toBeDefined();
    expect(sizes[2]!.attributes("data-availability")).toBe("out");
    expect(sizes[2]!.attributes("aria-label")).toBe("L, Sold out");
    await w.findAll('[data-option="color"] [role="radio"]')[1]!.trigger("click");
    expect(w.emitted("update:modelValue")?.at(-1)?.[0]).toEqual({ color: "sand", size: "s" });
    w.unmount();
  });

  it("flags an unpicked axis", () => {
    const w = mount(NqProductVariantPicker, { props: { product, modelValue: {}, invalid: ["size"] } });
    expect(w.find('[data-option="size"]').attributes("data-invalid")).toBeDefined();
  });
});

describe("NqProductGallery", () => {
  it("steps with the arrows and reports the index", async () => {
    const w = mount(NqProductGallery, { props: { images: product.images, name: "Tee" } });
    expect(w.attributes("data-slot")).toBe("product-gallery");
    expect(w.text()).toContain("1 / 2");
    await w.find('button[aria-label="Next image"]').trigger("click");
    expect(w.emitted("update:index")?.at(-1)).toEqual([1]);
    expect(w.text()).toContain("2 / 2");
  });

  it("flips the arrow keys in Arabic", async () => {
    const w = mount(
      { components: { NasaqProvider, NqProductGallery }, props: ["images"], template: `<NasaqProvider locale="ar" target="scope"><NqProductGallery :images="images" /></NasaqProvider>` },
      { props: { images: product.images } },
    );
    await w.find('[data-slot="product-gallery-stage"]').trigger("keydown", { key: "ArrowLeft" });
    expect(w.findComponent(NqProductGallery).emitted("update:index")?.at(-1)).toEqual([1]);
  });

  it("falls back to a placeholder on a broken image", async () => {
    const w = mount(NqProductGallery, { props: { images: product.images } });
    await w.find('[data-slot="product-gallery-stage"] img').trigger("error");
    expect(w.find('[data-slot="product-gallery-stage"] [role="img"]').exists()).toBe(true);
  });
});

describe("NqProductSizeGuide", () => {
  it("renders a trigger button", () => {
    const w = mount(NqProductSizeGuide, { props: { guide: { columns: ["Size", "Chest"], rows: [["S", "92"]] } } });
    expect(w.text()).toContain("Size guide");
  });
});

describe("NqProductDetail", () => {
  const mountPage = (props: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
    mount(NqProductDetail, { props: { product, currency: "USD", ...props }, attachTo: document.body, ...extra });

  it("renders the buy box with price, stock and the default trust text", () => {
    const w = mountPage();
    expect(w.attributes("data-slot")).toBe("product-detail");
    expect(w.find("h1").text()).toBe("Everyday tee");
    expect(w.text()).toContain("$29");
    expect(w.text()).toContain("In stock");
    expect(w.text()).toContain("Tracked shipping across Egypt.");
    expect(w.text()).not.toContain("Buy now");
    w.unmount();
  });

  it("adds the chosen variant and quantity, and says so", async () => {
    const onAdd = vi.fn(async (..._a: unknown[]) => undefined);
    const w = mountPage({ onAddToCart: onAdd });
    const add = w.findAll("button").find((b) => b.text() === "Add to cart")!;
    await add.trigger("click");
    await flushPromises();
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]![0]).toMatchObject({ id: "black-s" });
    expect(onAdd.mock.calls[0]![1]).toBe(1);
    expect(w.text()).toContain("Added to cart");
    w.unmount();
  });

  it("shows the error a handler returns", async () => {
    const w = mountPage({ onAddToCart: async () => ({ error: "Out of reach" }) });
    await w.findAll("button").find((b) => b.text() === "Add to cart")!.trigger("click");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toContain("Out of reach");
    w.unmount();
  });

  it("asks for a pick when nothing is selected", async () => {
    const onAdd = vi.fn();
    const w = mountPage({ blankSelection: true, onAddToCart: onAdd });
    await w.findAll("button").find((b) => b.text() === "Add to cart")!.trigger("click");
    await flushPromises();
    expect(onAdd).not.toHaveBeenCalled();
    expect(w.text()).toContain("Select Colour / Size first");
    expect(w.find('[data-option="size"]').attributes("data-invalid")).toBeDefined();
    w.unmount();
  });

  it("shows Buy now only with a listener, and the heart with a wishlist hook", async () => {
    const onWish = vi.fn();
    const w = mountPage({ onBuyNow: () => undefined, onWishlistChange: onWish, onAddToCart: () => undefined });
    expect(w.text()).toContain("Buy now");
    const heart = w.find('button[aria-label="Add to wishlist"]');
    await heart.trigger("click");
    expect(onWish).toHaveBeenCalledWith(true);
    expect(w.find('button[aria-pressed="true"]').exists()).toBe(true);
    w.unmount();
  });

  it("emits variant-change and disables a sold-out variant", async () => {
    const onChange = vi.fn();
    const w = mountPage({ onVariantChange: onChange });
    await w.findAll('[data-option="size"] [role="radio"]')[2]!.trigger("click");
    expect(onChange).toHaveBeenCalled();
    expect(w.text()).toContain("Out of stock");
    expect(w.findAll("button").find((b) => b.text() === "Sold out")?.attributes("disabled")).toBeDefined();
    w.unmount();
  });

  it("estimates delivery by city", () => {
    const w = mountPage({
      delivery: { cities: [{ id: "cairo", label: "Cairo", etaDays: [1, 2], fee: 0 }], now: "2026-01-05T08:00:00Z" },
    });
    expect(w.find('[data-slot="product-delivery"]').text()).toContain("Free delivery");
    expect(w.find('[data-slot="product-delivery"]').text()).toContain("Arrives");
    w.unmount();
  });

  it("renders sections and the reviews and related slots", () => {
    const w = mountPage({ shippingInfo: "Ships in 2 days." }, { slots: { reviews: "<p>Great</p>", related: "<p>More</p>" } });
    expect(w.find("#reviews").text()).toContain("Great");
    expect(w.find('[data-slot="product-detail-related"]').text()).toContain("You may also like");
    expect(w.text()).toContain("Description");
    w.unmount();
  });

  it("uses SAR and Arabic words under an Arabic provider", () => {
    const w = mount(
      { components: { NasaqProvider, NqProductDetail }, props: ["p"], template: `<NasaqProvider locale="ar" target="scope"><NqProductDetail :product="p" /></NasaqProvider>` },
      { props: { p: product } },
    );
    expect(w.text()).toContain("أضف إلى السلة");
    expect(w.text()).toMatch(/SAR|ر\.س/);
    expect(w.text()).toContain("شحن مع تتبع داخل مصر.");
  });
});
