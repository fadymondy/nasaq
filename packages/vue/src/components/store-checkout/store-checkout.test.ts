import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import type { CommerceAddress, CommerceCartLine, CommerceShippingMethod } from "./commerce";
import { NqStoreAddressForm, NqStoreCheckout, NqStoreOrderConfirmation, NqStoreOrderSummary, checkoutReduce, checkoutSummary, validateCheckoutAddress } from ".";

const lines: CommerceCartLine[] = [
  { id: "tee", productId: "tee", variantId: "m", name: "Everyday cotton tee", variantLabel: "Black / M", unitPrice: 2900, quantity: 2 },
  { id: "bottle", productId: "bottle", variantId: "b", name: "Steel water bottle", unitPrice: 2400, quantity: 1 },
];
const methods: CommerceShippingMethod[] = [
  { id: "standard", label: "Standard delivery", price: 500, etaDays: [3, 5] },
  { id: "express", label: "Express delivery", price: 1500, etaDays: [1, 2] },
];
const home: CommerceAddress = { id: "home", name: "Mona Adel", phone: "+20 100 123 4567", line1: "12 Nile Street", city: "Cairo", region: "", postalCode: "11728", country: "EG", isDefault: true };
const NOW = new Date("2026-09-29T09:00:00Z");

const withProvider = (child: () => ReturnType<typeof h>, locale: "en" | "ar" = "en") => defineComponent({ render: () => h(NasaqProvider, { locale }, { default: child }) });
const checkout = (props: Record<string, unknown> = {}, locale: "en" | "ar" = "en") =>
  mount(withProvider(() => h(NqStoreCheckout, { lines, currency: "USD", shippingMethods: methods, savedAddresses: [home], now: NOW, paymentPolicy: { card: true, cod: { fee: 250 } }, onPlaceOrder: async () => ({ orderNumber: "#2001" }), ...props }), locale), { attachTo: document.body });
const ready = { contact: { mode: "guest", email: "mona@example.com", marketing: false }, shippingMethodId: "standard", payment: { kind: "cod" } };

describe("checkout logic", () => {
  it("validates addresses by country and asks for the email first", () => {
    expect(validateCheckoutAddress({ country: "SA", name: "Ali Hassan", phone: "512345678", line1: "King Fahd Rd", city: "Riyadh" })).toMatchObject({ region: "required", postalCode: "required" });
    expect(checkoutSummary({ lines, discount: 0 }).subtotal).toBe(8200);
    const ctx = { shippingMethodIds: ["standard"], paymentAvailable: { card: true } };
    const state = checkoutReduce({ status: "editing", data: { contact: { mode: "guest", email: "", marketing: false }, shipping: {}, billingSame: true, billing: {}, payment: {}, notes: "", gift: { enabled: false, message: "", wrap: false, hidePrices: false } }, section: "contact", done: [], errors: {}, attempts: 0 }, { type: "continue" }, ctx);
    expect(state.section).toBe("contact");
    expect(state.errors["contact.email"]).toBe("required");
  });
});

describe("NqStoreCheckout", () => {
  it("renders the four sections with state attributes and the summary", () => {
    const w = checkout();
    expect(w.get('[data-slot="store-checkout"]').attributes("data-status")).toBe("editing");
    const sections = w.findAll('[data-slot="store-checkout-section"]');
    expect(sections.map((s) => s.attributes("data-section"))).toEqual(["contact", "address", "delivery", "payment"]);
    expect(sections.map((s) => s.attributes("data-state"))).toEqual(["open", "locked", "locked", "locked"]);
    expect(w.get('[data-slot="store-order-summary"]').text()).toContain("Everyday cotton tee");
    expect(w.get('[data-slot="store-place-order"]').text()).toContain("Place order");
    w.unmount();
  });

  it("blocks Continue on a missing email, then moves to the address section", async () => {
    const w = checkout();
    const next = () => w.findAll("button").find((b) => b.text() === "Continue")!;
    await next().trigger("click");
    expect(w.get('[data-section="contact"]').attributes("data-state")).toBe("open");
    expect(w.find('[data-slot="field-error"]').exists()).toBe(true);
    await w.get('input[name="email"]').setValue("mona@example.com");
    await next().trigger("click");
    await flushPromises();
    expect(w.get('[data-section="contact"]').attributes("data-state")).toBe("done");
    expect(w.get('[data-section="address"]').attributes("data-state")).toBe("open");
    expect(w.get('[data-section="contact"]').text()).toContain("mona@example.com");
    w.unmount();
  });

  it("places an order end to end and shows the confirmation", async () => {
    const onPlaceOrder = vi.fn(async () => ({ orderNumber: "#2001" }));
    const onPlaced = vi.fn();
    const w = checkout({ onPlaceOrder, onPlaced, defaultValues: ready });
    const next = () => w.findAll("button").find((b) => b.text() === "Continue")!;
    await next().trigger("click");
    await next().trigger("click");
    await next().trigger("click");
    await flushPromises();
    expect(w.get('[data-section="payment"]').attributes("data-state")).toBe("open");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onPlaceOrder).toHaveBeenCalledTimes(1);
    const draft = (onPlaceOrder.mock.calls[0] as unknown as [{ attempt: number; order: { totals: { total: number } } }])[0];
    expect(draft.attempt).toBe(1);
    expect(draft.order.totals.total).toBe(8200 + 500 + 250);
    expect(onPlaced).toHaveBeenCalledTimes(1);
    expect(w.find('[data-slot="store-order-confirmation"]').exists()).toBe(true);
    expect(w.text()).toContain("#2001");
    w.unmount();
  });

  it("shows a failure with Dismiss and retries", async () => {
    const onPlaceOrder = vi.fn().mockResolvedValueOnce({ error: "Card declined" }).mockResolvedValueOnce({ orderNumber: "#2002" });
    const w = checkout({ onPlaceOrder, defaultValues: ready });
    const next = () => w.findAll("button").find((b) => b.text() === "Continue")!;
    await next().trigger("click");
    await next().trigger("click");
    await next().trigger("click");
    await flushPromises();
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.get('[data-slot="store-checkout"]').attributes("data-status")).toBe("failed");
    expect(w.text()).toContain("Card declined");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onPlaceOrder).toHaveBeenCalledTimes(2);
    expect(w.text()).toContain("#2002");
    w.unmount();
  });

  it("shows an empty state without lines", () => {
    const w = checkout({ lines: [], onContinueShopping: () => {} });
    expect(w.find('[data-slot="empty-state"]').exists()).toBe(true);
    w.unmount();
  });

  it("speaks Arabic and bills SAR by default", () => {
    const w = checkout({ currency: undefined }, "ar");
    expect(w.get('[data-slot="store-order-summary"]').text()).toMatch(/SAR|ر\.س/);
    expect(w.get("h1").text()).not.toBe("Checkout");
    w.unmount();
  });
});

describe("NqStoreAddressForm", () => {
  it("changes fields with the country", () => {
    const qa = mount(withProvider(() => h(NqStoreAddressForm, { modelValue: { country: "QA" }, name: "ship" })));
    expect(qa.get('[data-slot="store-address-form"]').attributes("data-country")).toBe("QA");
    expect(qa.find('input[name="ship.postalCode"]').exists()).toBe(false);
    expect(qa.find('input[name="ship.region"]').exists()).toBe(false);
    const us = mount(withProvider(() => h(NqStoreAddressForm, { modelValue: { country: "US" }, name: "ship", errors: { postalCode: "postalCode" } })));
    expect(us.find('input[name="ship.postalCode"]').exists()).toBe(true);
    expect(us.text()).toContain("94105");
  });

  it("normalises the postal code on blur", async () => {
    const onUpdate = vi.fn();
    const w = mount(withProvider(() => h(NqStoreAddressForm, { modelValue: { country: "GB", postalCode: "sw1a1aa" }, name: "ship", "onUpdate:modelValue": onUpdate })));
    await w.get('input[name="ship.postalCode"]').trigger("blur");
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ postalCode: "SW1A 1AA" }));
  });
});

describe("NqStoreOrderSummary", () => {
  it("toggles the folded panel with aria-expanded", async () => {
    const summary = checkoutSummary({ lines, discount: 0 });
    const w = mount(withProvider(() => h(NqStoreOrderSummary, { lines, summary, currency: "USD" })));
    const toggle = w.get("button");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
  });
});

describe("NqStoreOrderConfirmation", () => {
  it("shows the order number and what happens next", () => {
    const order = {
      id: "o1",
      number: "#3001",
      status: "pending",
      payment: "cod",
      placedAt: "2026-09-29T09:00:00Z",
      customer: { name: "Mona Adel", email: "mona@example.com" },
      lines,
      totals: { subtotal: 8200, discount: 0, shipping: 500, tax: 0, total: 8700 },
      events: [],
    };
    const w = mount(withProvider(() => h(NqStoreOrderConfirmation, { order: order as never, currency: "USD", onTrackOrder: () => {} })));
    expect(w.get('[data-slot="store-order-confirmation"]').text()).toContain("#3001");
    expect(w.get("h1").attributes("tabindex")).toBe("-1");
    expect(w.text()).toContain("Track order");
  });
});
