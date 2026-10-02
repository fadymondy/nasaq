import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import type { CommerceCartLine } from "./commerce";
import { NqStoreCartAnnouncer, NqStoreCartButton, NqStoreCartLineItem, NqStoreCartPage, NqStoreFreeShippingBar, NqStoreQuantityStepper, NqStoreShippingEstimator, cartAdd, cartBlockers, cartSetQuantity, useStoreCart } from ".";

const tee: CommerceCartLine = { id: "tee-m", productId: "tee", variantId: "m", name: "Everyday cotton tee", variantLabel: "Black / M", unitPrice: 2900, quantity: 2, maxQuantity: 5 };
const mug: CommerceCartLine = { id: "mug", productId: "mug", variantId: "mug", name: "Mug", unitPrice: 1500, quantity: 1, maxQuantity: 0 };

const withProvider = (child: () => ReturnType<typeof h>, locale: "en" | "ar" = "en") => defineComponent({ render: () => h(NasaqProvider, { locale }, { default: child }) });

describe("cart logic", () => {
  it("clamps quantity to stock and merges lines", () => {
    const set = cartSetQuantity([tee], "tee-m", 99);
    expect(set.quantity).toBe(5);
    expect(set.clamped).toBe(true);
    const added = cartAdd([tee], { id: "tee-m", productId: "tee", variantId: "m", name: tee.name, unitPrice: 2900, maxQuantity: 5 }, 2);
    expect(added.lines.find((l) => l.id === "tee-m")?.quantity).toBe(4);
    expect(cartBlockers([mug])).toHaveLength(1);
  });
});

describe("useStoreCart", () => {
  it("adds, removes with undo and announces", () => {
    const cart = useStoreCart({ initialLines: [tee], feedback: "drawer" });
    cart.add({ id: "mug", productId: "mug", variantId: "mug", name: "Mug", unitPrice: 1500, maxQuantity: 9 });
    expect(cart.count).toBe(3);
    expect(cart.drawerOpen).toBe(true);
    expect(cart.message.text).toContain("Mug");
    cart.remove("mug");
    expect(cart.lines).toHaveLength(1);
    expect(cart.removed?.line.name).toBe("Mug");
    cart.undo();
    expect(cart.lines).toHaveLength(2);
    cart.saveForLater("mug");
    expect(cart.saved).toHaveLength(1);
    expect(cart.count).toBe(2);
  });
});

describe("NqStoreQuantityStepper", () => {
  it("steps, lowers typed values to the limit and shows the note", async () => {
    const onChange = vi.fn();
    const w = mount(withProvider(() => h(NqStoreQuantityStepper, { value: 2, max: 3, name: "Tee", onChange })));
    await w.find("[aria-label='Increase quantity of Tee']").trigger("click");
    expect(onChange).toHaveBeenLastCalledWith(3);
    const input = w.find("input");
    await input.setValue("9");
    await input.trigger("blur");
    expect(onChange).toHaveBeenLastCalledWith(3);
    await input.trigger("keydown", { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith(1);
    const atMax = mount(withProvider(() => h(NqStoreQuantityStepper, { value: 3, max: 3, name: "Tee" })));
    expect(atMax.text()).toContain("Only 3");
  });
});

describe("NqStoreCartLineItem", () => {
  it("shows a stock warning and only the actions it was given", async () => {
    const onRemove = vi.fn();
    const w = mount(withProvider(() => h("ul", [h(NqStoreCartLineItem, { line: { ...tee, quantity: 9 }, currency: "USD", onRemove })])));
    expect(w.find("[data-slot='store-cart-stock']").exists()).toBe(true);
    expect(w.text()).not.toContain("Save for later");
    await w.find("[aria-label='Remove Everyday cotton tee']").trigger("click");
    expect(onRemove).toHaveBeenCalled();
    expect(w.text()).toContain("$"); // USD default, never a shekel or EGP
  });
});

describe("NqStoreCartPage", () => {
  it("renders lines, summary and the free-shipping note, and wires quantity and remove", async () => {
    const onQuantityChange = vi.fn();
    const onRemove = vi.fn();
    const w = mount(withProvider(() => h(NqStoreCartPage, { lines: [tee], currency: "USD", freeShippingThreshold: 15000, onQuantityChange, onRemove, onCheckout: () => {} })));
    expect(w.find("[data-slot='store-cart-line']").exists()).toBe(true);
    expect(w.find("[data-slot='store-cart-summary']").exists()).toBe(true);
    expect(w.find("[data-slot='store-free-shipping']").exists()).toBe(true);
    await w.find("[aria-label='Increase quantity of Everyday cotton tee']").trigger("click");
    expect(onQuantityChange).toHaveBeenCalledWith("tee-m", 3);
    await w.find("[aria-label='Remove Everyday cotton tee']").trigger("click");
    expect(onRemove).toHaveBeenCalledWith("tee-m");
  });

  it("blocks checkout on an out-of-stock line and shows the empty and error states", async () => {
    const blocked = mount(withProvider(() => h(NqStoreCartPage, { lines: [mug], currency: "USD", onCheckout: () => {} })));
    expect(blocked.text()).toContain("need attention");
    expect(blocked.find("button[disabled]").exists()).toBe(true);
    const empty = mount(withProvider(() => h(NqStoreCartPage, { lines: [], currency: "USD", onContinueShopping: () => {} })));
    expect(empty.find("[data-slot='store-cart-empty']").exists()).toBe(true);
    const err = mount(withProvider(() => h(NqStoreCartPage, { lines: [], error: true, onRetry: () => {} })));
    expect(err.text()).toContain("could not load");
  });

  it("renders Arabic with RTL strings and SAR by default", () => {
    const w = mount(withProvider(() => h(NqStoreCartPage, { lines: [tee] }), "ar"));
    expect(w.text()).toContain("السلة");
    expect(w.text()).toMatch(/SAR|ر\.س/);
    expect(w.text()).not.toMatch(/EGP|₪|ج\.م/);
  });
});

describe("small parts", () => {
  it("cart button puts the count in the name, announcer reads the message, free bar unlocks", () => {
    const button = mount(withProvider(() => h(NqStoreCartButton, { count: 3 })));
    expect(button.find("button").attributes("aria-label")).toContain("3");
    const live = mount(withProvider(() => h(NqStoreCartAnnouncer, { message: { id: 1, text: "Added" } })));
    expect(live.find("[role='status']").text()).toContain("Added");
    const bar = mount(withProvider(() => h(NqStoreFreeShippingBar, { subtotal: 20000, threshold: 15000, currency: "USD" })));
    expect(bar.find("[data-slot='store-free-shipping']").attributes("data-unlocked")).toBeDefined();
  });

  it("shipping estimator finds a zone and emits the cheapest method", async () => {
    const zones = [{ id: "cai", label: "Cairo", cities: ["Cairo"], methods: [{ id: "std", label: "Standard", price: 500, etaDays: [2, 3] as [number, number] }] }];
    const w = mount(withProvider(() => h(NqStoreShippingEstimator, { zones, subtotal: 5000, currency: "USD" })));
    await w.find("input").setValue("Cairo");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Standard");
  });
});
