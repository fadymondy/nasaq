import assert from "node:assert/strict";
import { test } from "node:test";
import { cheapestDelivery, overlappingCountries, rateFor, resolveShippingOptions, tierFor, tierIssues, toCommerceShippingMethods, zoneFor } from "../src/components/store-settings/shipping-logic.ts";
import { duplicateTaxRegions, orderTax, splitTax, taxRateFor } from "../src/components/store-settings/tax-logic.ts";
import { allocate, canCombine, discountRejection, discountStanding, duplicateDiscountCodes, evaluateDiscounts, percentOf } from "../src/components/store-settings/discount-logic.ts";
import {
  adjustGiftCard,
  applyGiftCards,
  generateGiftCardCode,
  giftCardBalance,
  giftCardStatus,
  isValidGiftCardCode,
  issueGiftCard,
  ledgerIssues,
  maskGiftCardCode,
  redeemGiftCard,
  refundToGiftCard,
} from "../src/components/store-settings/gift-card-logic.ts";

/* ------------------------------------------------------------------ shipping */

const zones = [
  { id: "cairo", name: "Cairo", countries: ["EG"], cities: ["Cairo", "Giza"], rates: [{ id: "cairo-flat", label: "Cairo", type: "flat", amount: 3000 }] },
  {
    id: "eg",
    name: "Egypt",
    countries: ["EG"],
    rates: [
      { id: "std", label: "Standard", type: "weight", tiers: [{ min: 0, max: 1000, amount: 5000 }, { min: 1000, max: 5000, amount: 8000 }, { min: 5000, amount: 12000 }], etaDays: [3, 5] },
      { id: "free", label: "Free over", type: "free-over", freeOver: 100000, etaDays: [4, 6] },
      { id: "exp", label: "Express", type: "flat", amount: 15000, express: true, etaDays: [1, 1] },
    ],
  },
  { id: "row", name: "World", countries: ["*"], rates: [{ id: "intl", label: "Intl", type: "price", tiers: [{ min: 0, max: 50000, amount: 90000 }, { min: 50000, amount: 60000 }] }] },
];

test("zoneFor: city beats country beats rest of world", () => {
  assert.equal(zoneFor(zones, { country: "eg", city: "cairo" })?.id, "cairo");
  assert.equal(zoneFor(zones, { country: "EG", city: "Luxor" })?.id, "eg");
  assert.equal(zoneFor(zones, { country: "EG" })?.id, "eg");
  assert.equal(zoneFor(zones, { country: "FR" })?.id, "row");
  assert.equal(zoneFor(zones.slice(0, 1), { country: "FR" }), undefined);
});

test("tierFor: min inclusive, max exclusive", () => {
  const t = zones[1].rates[0].tiers;
  assert.equal(tierFor(t, 999)?.amount, 5000);
  assert.equal(tierFor(t, 1000)?.amount, 8000);
  assert.equal(tierFor(t, 99999)?.amount, 12000);
  assert.equal(tierFor([{ min: 100, amount: 1 }], 50), undefined);
});

test("rateFor: free-over, below threshold, hidden when no fallback", () => {
  const r = zones[1].rates[1];
  assert.deepEqual(rateFor(r, { subtotal: 100000, weightGrams: 0 }), { available: true, amount: 0, free: true });
  assert.deepEqual(rateFor(r, { subtotal: 40000, weightGrams: 0 }), { available: false, reason: "below-threshold", remaining: 60000 });
  assert.deepEqual(rateFor({ ...r, amount: 4000 }, { subtotal: 40000, weightGrams: 0 }), { available: true, amount: 4000, free: false });
  assert.equal(rateFor({ ...r, active: false }, { subtotal: 1, weightGrams: 0 }).available, false);
});

test("resolveShippingOptions: sorted, pickup included, hidden reported", () => {
  const pickups = [
    { id: "p1", name: "Store", address: "1 Main", country: "EG", city: "Alexandria", readyInHours: 24 },
    { id: "p2", name: "Cairo store", address: "2 Main", country: "EG", city: "Cairo" },
  ];
  const out = resolveShippingOptions(zones, pickups, { country: "EG", city: "Luxor" }, { subtotal: 20000, weightGrams: 1500 });
  assert.equal(out.zone?.id, "eg");
  assert.deepEqual(out.options.map((o) => o.id), ["std", "exp"]);
  assert.equal(out.options[0].amount, 8000);
  assert.deepEqual(out.hidden.map((h) => h.rateId), ["free"]);
  const cairo = resolveShippingOptions(zones, pickups, { country: "EG", city: "Cairo" }, { subtotal: 20000, weightGrams: 10 });
  assert.deepEqual(cairo.options.map((o) => o.id), ["p2", "cairo-flat"]);
  assert.equal(cairo.options[0].free, true);
  assert.equal(cheapestDelivery(cairo.options)?.id, "cairo-flat");
  assert.equal(toCommerceShippingMethods(cairo.options)[0].price, 0);
});

test("resolveShippingOptions: no zone still offers pickup", () => {
  const out = resolveShippingOptions([], [{ id: "p", name: "S", address: "a", country: "EG" }], { country: "EG" }, { subtotal: 1, weightGrams: 1 });
  assert.equal(out.zone, undefined);
  assert.deepEqual(out.options.map((o) => o.kind), ["pickup"]);
});

test("tierIssues finds overlap, gap, closed end, negative", () => {
  assert.deepEqual(tierIssues([]), ["no-tiers"]);
  assert.deepEqual(tierIssues([{ min: 0, max: 10, amount: 1 }, { min: 10, amount: 2 }]), []);
  assert.ok(tierIssues([{ min: 0, max: 10, amount: 1 }, { min: 5, amount: 2 }]).includes("overlap"));
  assert.ok(tierIssues([{ min: 0, max: 10, amount: 1 }, { min: 20, amount: 2 }]).includes("gap"));
  assert.ok(tierIssues([{ min: 0, max: 10, amount: 1 }]).includes("not-open-ended"));
  assert.ok(tierIssues([{ min: 0, amount: -1 }]).includes("negative"));
  assert.ok(tierIssues([{ min: 5, max: 5, amount: 1 }]).includes("min-after-max"));
});

test("overlappingCountries ignores city zones", () => {
  assert.deepEqual(overlappingCountries(zones), []);
  assert.deepEqual(overlappingCountries([...zones, { id: "x", name: "x", countries: ["eg"], rates: [] }]), ["EG"]);
});

/* ------------------------------------------------------------------ tax */

test("splitTax exclusive and inclusive add up", () => {
  assert.deepEqual(splitTax(10000, 1400, false), { net: 10000, tax: 1400, gross: 11400 });
  const inc = splitTax(11400, 1400, true);
  assert.deepEqual(inc, { net: 10000, tax: 1400, gross: 11400 });
  for (const a of [1, 99, 101, 12345, 99999]) {
    const s = splitTax(a, 1400, true);
    assert.equal(s.net + s.tax, a);
  }
  assert.equal(splitTax(5, 1400, false).tax, 1); // 0.7 rounds up
  assert.equal(splitTax(3, 1400, false).tax, 0); // 0.42 rounds down
  assert.deepEqual(splitTax(0, 1400, false), { net: 0, tax: 0, gross: 0 });
});

test("taxRateFor: region, country, wildcard, inactive", () => {
  const rates = [
    { id: "a", name: "A", country: "EG", bps: 1400, inclusive: false },
    { id: "b", name: "B", country: "EG", region: "Cairo", bps: 1000, inclusive: false },
    { id: "c", name: "C", country: "*", bps: 0, inclusive: false },
    { id: "d", name: "D", country: "SA", bps: 1500, inclusive: false, active: false },
  ];
  assert.equal(taxRateFor(rates, { country: "eg", region: "cairo" })?.id, "b");
  assert.equal(taxRateFor(rates, { country: "EG", region: "Giza" })?.id, "a");
  assert.equal(taxRateFor(rates, { country: "SA" })?.id, "c");
  assert.deepEqual(duplicateTaxRegions([...rates, { ...rates[0], id: "e" }]), ["EG/"]);
});

test("orderTax: inclusive adds nothing, exclusive adds, shipping optional", () => {
  const ex = { id: "x", name: "VAT", country: "EG", bps: 1400, inclusive: false };
  assert.deepEqual(orderTax({ goods: 10000, shipping: 1000, rate: ex }), { tax: 1400, added: 1400, total: 12400, inclusive: false, bps: 1400 });
  assert.equal(orderTax({ goods: 10000, shipping: 1000, rate: { ...ex, onShipping: true } }).tax, 1540);
  const inc = orderTax({ goods: 11400, shipping: 0, rate: { ...ex, inclusive: true } });
  assert.deepEqual([inc.tax, inc.added, inc.total], [1400, 0, 11400]);
  assert.equal(orderTax({ goods: 500, rate: undefined }).total, 500);
});

/* ------------------------------------------------------------------ discounts */

const NOW = "2026-06-15T12:00:00Z";
const line = (id, price, qty, extra = {}) => ({ id, productId: id, unitPrice: price, quantity: qty, ...extra });
const ctx = (lines, extra = {}) => ({ lines, now: NOW, ...extra });
const pct = (id, bps, extra = {}) => ({ id, title: id, method: "automatic", kind: "percentage", value: bps, ...extra });

test("percentOf rounds half up, integers only", () => {
  assert.equal(percentOf(1005, 1000), 101); // 100.5
  assert.equal(percentOf(1004, 1000), 100);
  assert.equal(percentOf(999, 3333), 333);
});

test("allocate sums exactly, largest remainder wins, ties earlier", () => {
  assert.deepEqual(allocate(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocate(10, [3, 3, 4]), [3, 3, 4]);
  assert.deepEqual(allocate(0, [1, 2]), [0, 0]);
  const parts = allocate(9999, [333, 777, 1234, 5]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 9999);
});

test("percentage: line shares add up to the total", () => {
  const r = evaluateDiscounts([pct("p", 1000)], ctx([line("a", 333, 1), line("b", 333, 1), line("c", 334, 1)]));
  assert.equal(r.subtotal, 1000);
  assert.equal(r.goodsDiscount, 100);
  assert.equal(Object.values(r.lineDiscounts).reduce((a, b) => a + b, 0), 100);
  assert.equal(r.goodsAfter, 900);
});

test("percentage: scope limits which lines", () => {
  const r = evaluateDiscounts([pct("p", 5000, { scope: { productIds: ["a"] } })], ctx([line("a", 1000, 1), line("b", 1000, 1)]));
  assert.deepEqual(r.lineDiscounts, { a: 500 });
  assert.equal(r.applied[0].class, "product");
});

test("percentage: excludeOnSale skips compare-at lines", () => {
  const r = evaluateDiscounts([pct("p", 1000, { excludeOnSale: true })], ctx([line("a", 1000, 1, { compareAt: 1500 }), line("b", 1000, 1)]));
  assert.deepEqual(r.lineDiscounts, { b: 100 });
});

test("fixed: capped at the goods; per item multiplies", () => {
  const f = { id: "f", title: "f", method: "automatic", kind: "fixed", value: 5000 };
  assert.equal(evaluateDiscounts([f], ctx([line("a", 1000, 2)])).goodsDiscount, 2000);
  assert.equal(evaluateDiscounts([{ ...f, value: 300, perItem: true }], ctx([line("a", 1000, 2), line("b", 500, 1)])).goodsDiscount, 900);
  assert.equal(evaluateDiscounts([{ ...f, value: 300 }], ctx([line("a", 1000, 2)])).goodsDiscount, 300);
});

test("maxDiscount caps every kind", () => {
  const r = evaluateDiscounts([pct("p", 5000, { maxDiscount: 700 })], ctx([line("a", 10000, 1)]));
  assert.equal(r.goodsDiscount, 700);
  assert.equal(r.applied[0].capped, true);
  const s = evaluateDiscounts([{ id: "s", title: "s", method: "automatic", kind: "free-shipping", maxDiscount: 2000 }], ctx([line("a", 1000, 1)], { shipping: 5000 }));
  assert.equal(s.shippingDiscount, 2000);
  assert.equal(s.shippingAfter, 3000);
});

test("free shipping: zero shipping is rejected", () => {
  const r = evaluateDiscounts([{ id: "s", title: "s", method: "automatic", kind: "free-shipping" }], ctx([line("a", 1000, 1)], { shipping: 0 }));
  assert.equal(r.applied.length, 0);
  assert.equal(r.rejected[0].reason, "no-shipping");
});

test("BXGY same scope: cheapest units are free, sets floor", () => {
  const d = { id: "b", title: "b", method: "automatic", kind: "bxgy", bxgy: { buyQty: 2, getQty: 1 } };
  // 5 units: one set of 3 -> cheapest of the top 3 is free... units 1000,900,800,700,600: pool sorted desc, set uses first 3, free = 800
  const r = evaluateDiscounts([d], ctx([line("a", 1000, 1), line("b", 900, 1), line("c", 800, 1), line("d", 700, 1), line("e", 600, 1)]));
  assert.equal(r.applied[0].sets, 1);
  assert.equal(r.applied[0].freeUnits, 1);
  assert.equal(r.goodsDiscount, 800);
  // 6 identical units: two sets
  const r2 = evaluateDiscounts([d], ctx([line("a", 1000, 6)]));
  assert.equal(r2.applied[0].sets, 2);
  assert.equal(r2.goodsDiscount, 2000);
  // maxSets
  const r3 = evaluateDiscounts([{ ...d, bxgy: { ...d.bxgy, maxSets: 1 } }], ctx([line("a", 1000, 6)]));
  assert.equal(r3.goodsDiscount, 1000);
  // not enough units
  assert.equal(evaluateDiscounts([d], ctx([line("a", 1000, 2)])).applied.length, 0);
});

test("BXGY distinct scopes and partial percentage", () => {
  const d = { id: "b", title: "b", method: "automatic", kind: "bxgy", bxgy: { buyQty: 1, buyScope: { productIds: ["shoes"] }, getQty: 1, getScope: { productIds: ["socks"] }, getPercentBps: 5000 } };
  const r = evaluateDiscounts([d], ctx([line("shoes", 8000, 1), line("socks", 999, 2)]));
  assert.equal(r.applied[0].sets, 1);
  assert.equal(r.goodsDiscount, 500); // half of 999 rounds half up
  assert.deepEqual(r.lineDiscounts, { socks: 500 });
  // no shoes in the cart -> nothing
  assert.equal(evaluateDiscounts([d], ctx([line("socks", 999, 2)])).applied.length, 0);
});

test("stacking: default is exclusive, best benefit wins", () => {
  const r = evaluateDiscounts([pct("ten", 1000), pct("twenty", 2000)], ctx([line("a", 10000, 1)]));
  assert.deepEqual(r.applied.map((a) => a.id), ["twenty"]);
  assert.deepEqual(r.rejected, [{ id: "ten", title: "ten", reason: "not-combinable", with: "twenty" }]);
});

test("stacking: both must allow each other's class; product first then order on the remainder", () => {
  const prod = pct("prod", 1000, { scope: { productIds: ["a"] }, combinesWith: { order: true } });
  const ord = pct("ord", 1000, { combinesWith: { product: true } });
  const r = evaluateDiscounts([ord, prod], ctx([line("a", 10000, 1)]));
  assert.equal(r.applied.length, 2);
  assert.deepEqual(r.applied.map((a) => a.id), ["prod", "ord"]);
  assert.equal(r.applied[0].amount, 1000);
  assert.equal(r.applied[1].amount, 900); // 10% of what is left
  assert.equal(r.goodsDiscount, 1900);
  // one side not allowing blocks it
  const stubborn = { ...ord, combinesWith: {} };
  assert.equal(canCombine(prod, stubborn), false);
  assert.equal(evaluateDiscounts([stubborn, prod], ctx([line("a", 10000, 1)])).applied.length, 1);
});

test("stacking: free shipping combines with a goods discount when allowed", () => {
  const p = pct("p", 1000, { combinesWith: { shipping: true } });
  const s = { id: "s", title: "s", method: "automatic", kind: "free-shipping", combinesWith: { order: true } };
  const r = evaluateDiscounts([p, s], ctx([line("a", 10000, 1)], { shipping: 700 }));
  assert.equal(r.applied.length, 2);
  assert.equal(r.shippingDiscount, 700);
  assert.equal(r.goodsDiscount, 1000);
});

test("discounts never take more than the goods", () => {
  const both = { combinesWith: { product: true, order: true } };
  const r = evaluateDiscounts(
    [pct("a", 9000, { scope: { productIds: ["a"] }, ...both }), { id: "f", title: "f", method: "automatic", kind: "fixed", value: 5000, ...both }],
    ctx([line("a", 1000, 1)]),
  );
  assert.equal(r.goodsDiscount, 1000);
  assert.equal(r.goodsAfter, 0);
});

test("codes: needed, case and spacing ignored", () => {
  const d = pct("c", 1000, { method: "code", code: "Spring 10" });
  assert.equal(evaluateDiscounts([d], ctx([line("a", 1000, 1)])).rejected[0].reason, "code-required");
  assert.equal(evaluateDiscounts([d], ctx([line("a", 1000, 1)], { codes: [" spring10 "] })).goodsDiscount, 100);
  assert.deepEqual(duplicateDiscountCodes([d, { ...d, id: "d", code: "SPRING10" }]), ["SPRING10"]);
});

test("schedule, active, limits", () => {
  const l = [line("a", 1000, 1)];
  const why = (d, extra) => discountRejection(d, ctx(l, extra));
  assert.equal(why(pct("x", 1, { active: false })), "inactive");
  assert.equal(why(pct("x", 1, { startsAt: "2026-07-01T00:00:00Z" })), "not-started");
  assert.equal(why(pct("x", 1, { endsAt: "2026-06-01T00:00:00Z" })), "ended");
  assert.equal(why(pct("x", 1, { limits: { total: 5 } }), { usage: { total: { x: 5 } } }), "limit-total");
  assert.equal(why(pct("x", 1, { limits: { total: 5 } }), { usage: { total: { x: 4 } } }), null);
  assert.equal(why(pct("x", 1, { limits: { perCustomer: 1 } }), { customer: { id: "u" }, usage: { byCustomer: { "x:u": 1 } } }), "limit-customer");
  assert.equal(discountStanding(pct("x", 1, { startsAt: "2026-07-01T00:00:00Z" }), NOW), "scheduled");
  assert.equal(discountStanding(pct("x", 1, { limits: { total: 2 } }), NOW, 2), "used-up");
  assert.equal(discountStanding(pct("x", 1), NOW), "live");
});

test("eligibility: segments, specific customers, first order, minimums", () => {
  const l = [line("a", 1000, 2)];
  const why = (d, extra) => discountRejection(d, ctx(l, extra));
  assert.equal(why(pct("x", 1, { customers: { mode: "segments", segments: ["vip"] } }), { customer: { segments: ["new"] } }), "customer");
  assert.equal(why(pct("x", 1, { customers: { mode: "segments", segments: ["vip"] } }), { customer: { segments: ["vip"] } }), null);
  assert.equal(why(pct("x", 1, { customers: { mode: "specific", customerIds: ["u1"] } }), { customer: { id: "u2" } }), "customer");
  assert.equal(why(pct("x", 1, { firstOrderOnly: true }), { customer: { ordersCount: 2 } }), "first-order");
  assert.equal(why(pct("x", 1, { firstOrderOnly: true }), {}), null);
  assert.equal(why(pct("x", 1, { minSubtotal: 2001 })), "min-subtotal");
  assert.equal(why(pct("x", 1, { minSubtotal: 2000 })), null);
  assert.equal(why(pct("x", 1, { minQuantity: 3 })), "min-quantity");
});

test("empty cart and zero-quantity lines are harmless", () => {
  const r = evaluateDiscounts([pct("x", 1000)], ctx([line("a", 1000, 0)]));
  assert.equal(r.subtotal, 0);
  assert.equal(r.applied.length, 0);
  assert.equal(r.rejected[0].reason, "no-match");
});

/* ------------------------------------------------------------------ gift cards */

const card = () => issueGiftCard({ id: "gc1", code: "abcd-efgh", amount: 10000, currency: "EGP", now: "2026-01-01T00:00:00Z", expiresAt: "2027-01-01T00:00:00Z" });

test("issue, balance, status", () => {
  const c = card();
  assert.equal(giftCardBalance(c, NOW), 10000);
  assert.equal(giftCardStatus(c, NOW), "active");
  assert.equal(giftCardStatus(c, "2027-02-01T00:00:00Z"), "expired");
  assert.equal(giftCardBalance(c, "2027-02-01T00:00:00Z"), 0);
  assert.equal(giftCardStatus({ ...c, disabled: true }, NOW), "disabled");
  assert.deepEqual(issueGiftCard({ id: "x", code: "a", amount: 0, currency: "EGP", now: NOW }), { error: "invalid-amount" });
});

test("redeem takes at most the balance; exact refuses", () => {
  const c = card();
  const a = redeemGiftCard(c, 4000, { now: NOW, orderId: "o1" });
  assert.ok(a.ok);
  assert.equal(a.balance, 6000);
  assert.equal(c.ledger.length, 1, "original card is not mutated");
  const b = redeemGiftCard(a.card, 99999, { now: NOW });
  assert.ok(b.ok);
  assert.equal(b.redeemed, 6000);
  assert.equal(giftCardStatus(b.card, NOW), "depleted");
  assert.deepEqual(redeemGiftCard(b.card, 1, { now: NOW }), { ok: false, error: "empty" });
  assert.deepEqual(redeemGiftCard(a.card, 99999, { now: NOW, exact: true }), { ok: false, error: "over-balance" });
  assert.deepEqual(redeemGiftCard(c, 1.5, { now: NOW }), { ok: false, error: "invalid-amount" });
  assert.deepEqual(redeemGiftCard(c, 100, { now: NOW, currency: "USD" }), { ok: false, error: "currency" });
  assert.deepEqual(redeemGiftCard({ ...c, disabled: true }, 100, { now: NOW }), { ok: false, error: "disabled" });
  assert.deepEqual(redeemGiftCard(c, 100, { now: "2028-01-01T00:00:00Z" }), { ok: false, error: "expired" });
});

test("refund cannot exceed what the order redeemed; adjust cannot go below zero", () => {
  const a = redeemGiftCard(card(), 3000, { now: NOW, orderId: "o1" });
  const r = refundToGiftCard(a.card, 1000, { now: NOW, orderId: "o1" });
  assert.ok(r.ok);
  assert.equal(r.balance, 8000);
  assert.deepEqual(refundToGiftCard(r.card, 2500, { now: NOW, orderId: "o1" }), { ok: false, error: "over-balance" });
  const adj = adjustGiftCard(r.card, -8000, { now: NOW });
  assert.ok(adj.ok);
  assert.equal(adj.balance, 0);
  assert.deepEqual(adjustGiftCard(r.card, -8001, { now: NOW }), { ok: false, error: "over-balance" });
  assert.deepEqual(ledgerIssues(adj.card.ledger), []);
});

test("applyGiftCards: soonest expiry first, never over the total", () => {
  const mk = (id, amount, expiresAt) => issueGiftCard({ id, code: id, amount, currency: "EGP", now: "2026-01-01T00:00:00Z", expiresAt });
  const a = mk("a", 5000, "2027-06-01T00:00:00Z");
  const b = mk("b", 5000, "2026-12-01T00:00:00Z");
  const c = mk("c", 5000);
  const r = applyGiftCards([a, b, c], 7000, { now: NOW });
  assert.deepEqual(r.applied.map((x) => [x.cardId, x.amount]), [["b", 5000], ["a", 2000]]);
  assert.equal(r.remaining, 0);
  const over = applyGiftCards([a, b, c], 99999, { now: NOW });
  assert.equal(over.covered, 15000);
  assert.equal(over.remaining, 99999 - 15000);
  assert.equal(applyGiftCards([a], 100, { now: NOW, currency: "USD" }).applied.length, 0);
});

test("codes: generated codes validate, typos do not, masking hides", () => {
  let n = 0.11;
  const rnd = () => (n = (n * 7.13 + 0.37) % 1);
  for (let i = 0; i < 25; i += 1) {
    const code = generateGiftCardCode(rnd);
    assert.match(code, /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/);
    assert.ok(isValidGiftCardCode(code));
    assert.ok(isValidGiftCardCode(code.toLowerCase().replace(/-/g, " ")));
  }
  const good = generateGiftCardCode(rnd);
  const flip = good[0] === "2" ? "3" : "2";
  assert.equal(isValidGiftCardCode(flip + good.slice(1)), false);
  assert.equal(isValidGiftCardCode("nope"), false);
  assert.equal(maskGiftCardCode("K7QM2XRD9TWB4HC6"), "••••-••••-••••-4HC6");
});

test("ledgerIssues flags bad signs and a dip below zero", () => {
  assert.ok(ledgerIssues([]).includes("no-issue"));
  const bad = [
    { id: "1", kind: "issue", amount: 100, at: "2026-01-01T00:00:00Z" },
    { id: "1", kind: "redeem", amount: 500, at: "2025-01-01T00:00:00Z" },
  ];
  const issues = ledgerIssues(bad);
  for (const i of ["duplicate-id", "sign", "out-of-order"]) assert.ok(issues.includes(i), i);
  const neg = ledgerIssues([{ id: "1", kind: "issue", amount: 100, at: "2026-01-01T00:00:00Z" }, { id: "2", kind: "redeem", amount: -200, at: "2026-01-02T00:00:00Z" }]);
  assert.deepEqual(neg, ["negative-balance"]);
});
