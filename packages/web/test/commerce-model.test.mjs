import assert from "node:assert/strict";
import { test } from "node:test";
import { commerceClampQuantity, commerceDiscountPercent, commerceFindVariant, commerceFreeShippingProgress, commerceTotals, commerceValueAvailability } from "../src/lib/commerce.ts";
import {
  COMMERCE_FULFILMENT_LABEL, COMMERCE_ORDER_STATUS_LABEL, COMMERCE_ORDER_STATUS_VARIANT, COMMERCE_PAYMENT_LABEL,
  commerceAutoSelectSingle, commerceCheckoutSummary, commerceDeliveryWindow, commerceDeliveryZone, commerceDisplayPrice, commerceLowStock,
  commerceMatchDeliveryZone, commerceMinorFactor, commerceNormalizePlace, commerceRateFor, commerceSelectOptionValue, commerceStockState,
  commerceTierFor, commerceToMajor,
} from "../src/lib/commerce.ts";

const product = {
  id: "p", name: "Tee", images: [],
  options: [{ id: "c", name: "Colour", values: [{ id: "red", label: "Red" }, { id: "blue", label: "Blue" }] }, { id: "s", name: "Size", values: [{ id: "m", label: "M" }, { id: "l", label: "L" }] }],
  variants: [
    { id: "rm", options: { c: "red", s: "m" }, price: 1000, stock: 0 },
    { id: "rl", options: { c: "red", s: "l" }, price: 1000, stock: 3 },
    { id: "bm", options: { c: "blue", s: "m" }, price: 1200 },
  ],
};

test("finds a variant only when every axis is picked", () => {
  assert.equal(commerceFindVariant(product, { c: "red" }), undefined);
  assert.equal(commerceFindVariant(product, { c: "red", s: "l" }).id, "rl");
});

test("value availability: out, available and missing combinations", () => {
  assert.deepEqual(commerceValueAvailability(product, { c: "red" }, "s"), { m: "out", l: "available" });
  assert.deepEqual(commerceValueAvailability(product, { c: "blue" }, "s"), { m: "available", l: "none" });
});

test("totals: discount capped, free shipping, exclusive and inclusive tax", () => {
  const lines = [{ id: "1", productId: "p", variantId: "rl", name: "Tee", unitPrice: 1000, compareAt: 1500, quantity: 2 }, { id: "2", productId: "p", variantId: "bm", name: "Tee", unitPrice: 1200, quantity: 1, savedForLater: true }];
  const ship = { id: "std", label: "Standard", price: 500, freeOver: 1800 };
  const t = commerceTotals({ lines, discount: 100, shipping: ship, taxBps: 1400 });
  assert.deepEqual(t, { subtotal: 2000, discount: 100, shipping: 0, tax: 266, total: 2166, itemCount: 2, savings: 1100 });
  const inc = commerceTotals({ lines, taxBps: 1400, taxInclusive: true });
  assert.equal(inc.total, 2000);
  assert.equal(inc.tax, 246);
});

test("helpers", () => {
  assert.equal(commerceDiscountPercent(799, 1000), 20);
  assert.deepEqual(commerceFreeShippingProgress(1500, 2000), { remaining: 500, progress: 0.75 });
  assert.equal(commerceClampQuantity(9, 3), 3);
  assert.equal(commerceClampQuantity(0), 1);
});

test("minor factor and major conversion follow the currency", () => {
  assert.equal(commerceMinorFactor("EGP"), 100);
  assert.equal(commerceMinorFactor("egp"), 100);
  assert.equal(commerceMinorFactor("JPY"), 1);
  assert.equal(commerceMinorFactor("KWD"), 1000);
  assert.equal(commerceMinorFactor("NOPE-X"), 100);
  assert.equal(commerceToMajor(12550, "EGP"), 125.5);
  assert.equal(commerceToMajor(500, "JPY"), 500);
});

test("stock state and low-stock list", () => {
  assert.deepEqual(commerceStockState(undefined), { kind: "unavailable" });
  assert.deepEqual(commerceStockState({ id: "v", options: {}, price: 1 }), { kind: "untracked" });
  assert.deepEqual(commerceStockState({ id: "v", options: {}, price: 1, stock: 0 }), { kind: "out" });
  assert.deepEqual(commerceStockState({ id: "v", options: {}, price: 1, stock: 0, allowBackorder: true }), { kind: "backorder" });
  assert.deepEqual(commerceStockState({ id: "v", options: {}, price: 1, stock: 5 }), { kind: "low", left: 5 });
  assert.deepEqual(commerceStockState({ id: "v", options: {}, price: 1, stock: 6 }), { kind: "in-stock", left: 6 });
  const items = commerceLowStock([product]);
  assert.ok(items.every((i) => i.stock <= 5));
  assert.equal(items[0].stock, 0);
});

test("option selection keeps picks possible and auto-picks lone values", () => {
  const lone = { ...product, variants: [{ id: "x", options: { c: "red", s: "l" }, price: 1 }] };
  assert.deepEqual(commerceAutoSelectSingle(lone, {}), { c: "red", s: "l" });
  assert.deepEqual(commerceAutoSelectSingle(product, {}), {});
  // blue has only size M, so choosing blue drops the incompatible L pick and auto-picks M
  assert.deepEqual(commerceSelectOptionValue(product, { c: "red", s: "l" }, "c", "blue"), { c: "blue", s: "m" });
  assert.deepEqual(commerceSelectOptionValue(product, { c: "red" }, "c", "nope"), { c: "red" });
});

test("display price: selected variant, or lowest with 'from'", () => {
  const p = { ...product, variants: [{ id: "a", options: { c: "red", s: "m" }, price: 800, compareAt: 1000 }, { id: "b", options: { c: "red", s: "l" }, price: 1200 }] };
  assert.deepEqual(commerceDisplayPrice(p, undefined), { price: 800, compareAt: 1000, percentOff: 20, from: true });
  assert.deepEqual(commerceDisplayPrice(p, p.variants[1]), { price: 1200, percentOff: 0, from: false });
});

test("delivery window", () => {
  assert.deepEqual(commerceDeliveryWindow("2026-09-30T09:00:00Z", [2, 4]), { from: "2026-10-02", to: "2026-10-04" });
  assert.deepEqual(commerceDeliveryWindow("2026-09-30T18:00:00Z", [1, 1], { cutoffHour: 14 }), { from: "2026-10-02", to: "2026-10-02" });
});

test("checkout summary adds COD and gift-wrap fees to the total", () => {
  const lines = [{ id: "1", productId: "p", variantId: "rl", name: "Tee", unitPrice: 1000, quantity: 2 }];
  const s = commerceCheckoutSummary({ lines, paymentKind: "cod", policy: { cod: { fee: 300 } }, giftWrap: true, giftWrapFee: 100 });
  assert.equal(s.total, 2000);
  assert.equal(s.codFee, 300);
  assert.equal(s.giftWrapFee, 100);
  assert.equal(s.payable, 2400);
  assert.equal(commerceCheckoutSummary({ lines, paymentKind: "card", policy: { cod: { fee: 300 } } }).payable, 2000);
});

test("place names fold English and Arabic spellings", () => {
  assert.equal(commerceNormalizePlace("  Cairo! "), "cairo");
  assert.equal(commerceNormalizePlace("الإسكندرية"), commerceNormalizePlace("اسكندريه"));
  assert.equal(commerceNormalizePlace("القاهرة"), commerceNormalizePlace("قاهره"));
});

test("shipping tiers, rates and zones", () => {
  const tiers = [{ min: 1000, amount: 90 }, { min: 0, max: 1000, amount: 50 }];
  assert.equal(commerceTierFor(tiers, 999).amount, 50);
  assert.equal(commerceTierFor(tiers, 1000).amount, 90);
  assert.equal(commerceTierFor(tiers, -1), undefined);
  const cart = { subtotal: 1500, weightGrams: 400 };
  assert.deepEqual(commerceRateFor({ id: "f", label: "Flat", type: "flat", amount: 0 }, cart), { available: true, amount: 0, free: true });
  assert.deepEqual(commerceRateFor({ id: "w", label: "W", type: "weight", tiers }, cart), { available: true, amount: 50, free: false });
  assert.deepEqual(commerceRateFor({ id: "o", label: "O", type: "free-over", freeOver: 2000 }, cart), { available: false, reason: "below-threshold", remaining: 500 });
  assert.deepEqual(commerceRateFor({ id: "i", label: "I", type: "flat", active: false }, cart), { available: false, reason: "inactive" });
  const zone = { id: "z", name: "Cairo", countries: ["EG"], rates: [{ id: "s", label: "Std", type: "flat", amount: 40, etaDays: [2, 3] }, { id: "x", label: "Express", type: "flat", amount: 90, express: true }, { id: "o", label: "O", type: "free-over", freeOver: 5000 }] };
  const dz = commerceDeliveryZone(zone, cart, ["Cairo", "القاهرة"]);
  assert.deepEqual(dz.methods.map((m) => [m.id, m.kind]), [["s", "delivery"], ["x", "express"]]);
  assert.equal(commerceMatchDeliveryZone([dz], "القاهره")?.id, "z");
  assert.equal(commerceMatchDeliveryZone([dz], "Luxor"), undefined);
  assert.equal(commerceMatchDeliveryZone([dz], ""), undefined);
});

test("status word maps cover every status in both languages", () => {
  for (const map of [COMMERCE_ORDER_STATUS_LABEL, COMMERCE_PAYMENT_LABEL, COMMERCE_FULFILMENT_LABEL]) {
    for (const v of Object.values(map)) assert.ok(v.en && v.ar);
  }
  assert.deepEqual(Object.keys(COMMERCE_ORDER_STATUS_VARIANT), Object.keys(COMMERCE_ORDER_STATUS_LABEL));
});
