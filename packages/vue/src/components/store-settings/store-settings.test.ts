import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bpsToPercent,
  generateGiftCardCode,
  issueGiftCard,
  NqDiscountSimulator,
  NqDiscountsManager,
  NqGiftCardField,
  NqGiftCardsManager,
  NqShippingSettings,
  NqTaxSettings,
  orderTax,
  percentToBps,
  resolveShippingOptions,
  type Discount,
  type GiftCard,
  type PickupLocation,
  type ShippingZone,
  type TaxRate,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const now = new Date("2026-09-29T09:00:00");
const ok = vi.fn(async () => ({}));
const zones: ShippingZone[] = [
  { id: "z1", name: "Cairo", countries: ["EG"], rates: [{ id: "r1", label: "Standard", type: "flat", amount: 5000, etaDays: [2, 3], active: true }, { id: "r2", label: "Express", type: "flat", amount: 12000, express: true, active: true }] },
  { id: "z2", name: "World", countries: ["*"], rates: [] },
];
const pickups: PickupLocation[] = [{ id: "p1", name: "Maadi store", address: "12 Road 9", country: "EG", active: true }];
const taxes: TaxRate[] = [{ id: "t1", name: "VAT", country: "EG", bps: 1400, inclusive: true, onShipping: true, active: true }];
const discounts: Discount[] = [
  { id: "d1", title: "Summer 10", method: "code", code: "SUMMER10", kind: "percentage", value: 1000, active: true, combinesWith: {} },
  { id: "d2", title: "Free shipping", method: "automatic", kind: "free-shipping", active: true, combinesWith: {} },
];
const products = [{ id: "pr1", name: "Linen shirt", images: [], options: [], variants: [{ id: "v1", options: {}, price: 25000 }] }];
const card = (): GiftCard => issueGiftCard({ id: "gc1", code: generateGiftCardCode(), amount: 50000, currency: "USD", now }) as GiftCard;

describe("store-settings helpers", () => {
  it("converts percent text and basis points", () => {
    expect(percentToBps("14")).toBe(1400);
    expect(percentToBps("7.25")).toBe(725);
    expect(percentToBps("x")).toBeUndefined();
    expect(bpsToPercent(725)).toBe("7.25");
  });
  it("resolves shipping and tax with the shared logic", () => {
    expect(resolveShippingOptions(zones, pickups, { country: "EG" }, { subtotal: 1000, weightGrams: 100 }).options.length).toBeGreaterThan(1);
    expect(orderTax({ goods: 11400, rate: taxes[0] }).tax).toBe(1400);
  });
});

describe("NqShippingSettings", () => {
  it("lists zones, pickups and the tester in USD", () => {
    const w = mount(NqShippingSettings, { props: { zones, pickups, onSaveZone: ok, onDeleteZone: ok, onSavePickup: ok, onDeletePickup: ok } });
    expect(w.attributes("data-slot")).toBe("shipping-settings");
    expect(w.text()).toContain("Cairo");
    expect(w.text()).toContain("Maadi store");
    expect(w.find('[data-slot="shipping-tester"]').exists()).toBe(true);
    expect(w.text()).toContain("$");
  });
  it("shows the error and busy states", () => {
    const err = mount(NqShippingSettings, { props: { zones, onSaveZone: ok, error: "Boom" } });
    expect(err.text()).toContain("Boom");
    const busy = mount(NqShippingSettings, { props: { zones, onSaveZone: ok, loading: true } });
    expect(busy.attributes("aria-busy")).toBe("true");
  });
  it("opens the zone editor from the add button", async () => {
    const w = mount(NqShippingSettings, { props: { zones, onSaveZone: ok }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text().includes("Add"))?.trigger("click");
    await flushPromises();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    w.unmount();
  });
});

describe("NqTaxSettings", () => {
  it("renders the rates table and the calculator", () => {
    const w = mount(NqTaxSettings, { props: { rates: taxes, onSave: ok } });
    expect(w.attributes("data-slot")).toBe("tax-settings");
    expect(w.text()).toContain("VAT");
    expect(w.find('[data-slot="tax-calculator"]').exists()).toBe(true);
  });
});

describe("NqDiscountsManager", () => {
  it("renders discounts and the simulator when products are given", () => {
    const w = mount(NqDiscountsManager, { props: { discounts, products, now, onSave: ok } });
    expect(w.attributes("data-slot")).toBe("discounts-manager");
    expect(w.text()).toContain("Summer 10");
    expect(w.find('[data-slot="discount-simulator"]').exists()).toBe(true);
  });
  it("hides the simulator without products", () => {
    const w = mount(NqDiscountsManager, { props: { discounts, now, onSave: ok } });
    expect(w.find('[data-slot="discount-simulator"]').exists()).toBe(false);
  });
});

describe("NqDiscountSimulator", () => {
  it("applies a typed code to the basket", async () => {
    const w = mount(NqDiscountSimulator, { props: { discounts, products, now } });
    expect(w.text()).toContain("Linen shirt");
    await w.find("input.uppercase").setValue("summer10");
    expect(w.text()).toContain("Summer 10");
  });
});

describe("NqGiftCardsManager", () => {
  it("lists cards with their balance", () => {
    const w = mount(NqGiftCardsManager, { props: { cards: [card()], now, onIssue: ok, onUpdate: ok } });
    expect(w.attributes("data-slot")).toBe("gift-cards-manager");
    expect(w.text()).toContain("500");
  });
});

describe("NqGiftCardField", () => {
  it("refuses a malformed code before any lookup", async () => {
    const onLookup = vi.fn();
    const w = mount(NqGiftCardField, { props: { cards: [], total: 10000, now, onLookup, onCardsChange: vi.fn() } });
    expect(w.attributes("data-slot")).toBe("gift-card-field");
    await w.find("input").setValue("nope");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onLookup).not.toHaveBeenCalled();
    expect(w.find('[role="alert"]').text()).not.toBe("");
  });
  it("adds a found card and reports the split", async () => {
    const c = card();
    const onCardsChange = vi.fn();
    const onChange = vi.fn();
    const w = mount(NqGiftCardField, { props: { cards: [], total: 10000, now, onLookup: async () => c, onCardsChange, onChange } });
    await w.find("input").setValue(c.code);
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onCardsChange).toHaveBeenCalledWith([c]);
    expect(onChange).toHaveBeenCalled();
  });
});
