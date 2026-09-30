import assert from "node:assert/strict";
import { test } from "node:test";
import "./_ts-resolve.mjs";

const rules = await import("../src/components/store-checkout/address-rules.ts");
const machine = await import("../src/components/store-checkout/checkout-machine.ts");
const { storeAddressLines, countryRule, formatPhoneE164, isValidEmail, isValidPhone, nationalPhone, normalizeAddress, normalizeStoreDigits, normalizePostalCode, validateStoreAddress } = rules;
const {
  buildOrder,
  canPlaceOrder,
  checkoutReduce,
  checkoutSummary,
  emptyCheckoutData,
  etaWindow,
  firstInvalidSection,
  initialCheckout,
  nextOpenSection,
  paymentAvailability,
  validateCheckout,
  validateSection,
} = machine;

/* ------------------------------------------------------------------ address rules */

const egypt = { name: "Sara Ahmed", phone: "+20 100 123 4567", line1: "12 Palm Street", city: "Cairo", country: "EG" };

test("normalizeStoreDigits converts Arabic-Indic and Persian digits", () => {
  assert.equal(normalizeStoreDigits("٠١٠٠١٢٣٤٥٦٧"), "01001234567");
  assert.equal(normalizeStoreDigits("۱۲۳"), "123");
});

test("phone numbers: national form and validity per country", () => {
  assert.equal(nationalPhone("EG", "+20 100 123 4567"), "1001234567");
  assert.equal(nationalPhone("EG", "0100 123 4567"), "1001234567");
  assert.equal(nationalPhone("EG", "٠١٠٠١٢٣٤٥٦٧"), "1001234567");
  assert.equal(nationalPhone("EG", "00201001234567"), "1001234567");
  assert.equal(isValidPhone("EG", "01001234567"), true);
  assert.equal(isValidPhone("EG", "0300 123 4567"), false);
  assert.equal(isValidPhone("SA", "+966 50 123 4567"), true);
  assert.equal(isValidPhone("SA", "0501234567"), true);
  assert.equal(isValidPhone("SA", "0601234567"), false);
  assert.equal(isValidPhone("AE", "+971501234567"), true);
  assert.equal(isValidPhone("US", "(415) 555-0132"), true);
  assert.equal(isValidPhone("US", "+1 415 555 0132"), true);
  assert.equal(isValidPhone("US", "155 555 0132"), false);
  assert.equal(isValidPhone("XX", "1234567"), true);
  assert.equal(isValidPhone("XX", "123"), false);
  assert.equal(formatPhoneE164("EG", "0100 123 4567"), "+201001234567");
  assert.equal(formatPhoneE164("US", "(415) 555-0132"), "+14155550132");
});

test("postal codes are normalised per country", () => {
  assert.equal(normalizePostalCode("GB", "sw1a1aa"), "SW1A 1AA");
  assert.equal(normalizePostalCode("GB", "sw1a 1aa"), "SW1A 1AA");
  assert.equal(normalizePostalCode("CA", "k1a0b1"), "K1A 0B1");
  assert.equal(normalizePostalCode("US", "941051234"), "94105-1234");
  assert.equal(normalizePostalCode("EG", "١١٧٦٥"), "11765");
  assert.equal(normalizePostalCode("DE", " 10115 "), "10115");
});

test("validateStoreAddress: a good Egyptian address passes, postal code optional", () => {
  assert.deepEqual(validateStoreAddress(egypt), {});
  assert.deepEqual(validateStoreAddress({ ...egypt, postalCode: "11765" }), {});
  assert.equal(validateStoreAddress({ ...egypt, postalCode: "1176" }).postalCode, "postalCode");
});

test("validateStoreAddress: required fields and their problems", () => {
  const errors = validateStoreAddress({ country: "EG" });
  assert.deepEqual(errors, { name: "required", phone: "required", line1: "required", city: "required" });
  assert.equal(validateStoreAddress({ ...egypt, name: "S" }).name, "tooShort");
  assert.equal(validateStoreAddress({ ...egypt, name: "x".repeat(81) }).name, "tooLong");
  assert.equal(validateStoreAddress({ ...egypt, phone: "12" }).phone, "phone");
  assert.equal(validateStoreAddress({ ...egypt, line1: "ab" }).line1, "tooShort");
});

test("validateStoreAddress: Saudi Arabia needs a district and a postal code", () => {
  const sa = { name: "Omar Nasser", phone: "0501234567", line1: "King Fahd Road", city: "Riyadh", country: "SA" };
  assert.deepEqual(validateStoreAddress(sa), { region: "required", postalCode: "required" });
  assert.deepEqual(validateStoreAddress({ ...sa, region: "Olaya", postalCode: "12211" }), {});
  assert.equal(validateStoreAddress({ ...sa, region: "Olaya", postalCode: "1221" }).postalCode, "postalCode");
});

test("validateStoreAddress: UAE has an emirate list and no postal code", () => {
  const ae = { name: "Mona Adel", phone: "0501234567", line1: "Sheikh Zayed Road", city: "Dubai", country: "AE" };
  assert.deepEqual(validateStoreAddress(ae), { region: "required" });
  assert.equal(validateStoreAddress({ ...ae, region: "Narnia" }).region, "region");
  assert.deepEqual(validateStoreAddress({ ...ae, region: "Dubai", postalCode: "anything" }), {});
});

test("validateStoreAddress: US, UK and Canada postal formats", () => {
  const base = { name: "Alex Doe", line1: "1 Market St", city: "Town" };
  const us = { ...base, country: "US", phone: "4155550132", region: "CA" };
  assert.deepEqual(validateStoreAddress({ ...us, postalCode: "94105" }), {});
  assert.deepEqual(validateStoreAddress({ ...us, postalCode: "94105-1234" }), {});
  assert.equal(validateStoreAddress({ ...us, postalCode: "9410" }).postalCode, "postalCode");
  const gb = { ...base, country: "GB", phone: "07911123456" };
  assert.deepEqual(validateStoreAddress({ ...gb, postalCode: "sw1a1aa" }), {});
  assert.equal(validateStoreAddress({ ...gb, postalCode: "12345" }).postalCode, "postalCode");
  const ca = { ...base, country: "CA", phone: "6135550132", region: "ON" };
  assert.deepEqual(validateStoreAddress({ ...ca, postalCode: "k1a0b1" }), {});
  assert.equal(validateStoreAddress({ ...ca, postalCode: "K1A" }).postalCode, "postalCode");
});

test("validateStoreAddress can skip the phone for a billing address", () => {
  const { phone, ...billing } = egypt;
  assert.equal(validateStoreAddress(billing).phone, "required");
  assert.deepEqual(validateStoreAddress(billing, { skip: ["phone"] }), {});
});

test("unknown countries fall back to loose rules", () => {
  assert.equal(countryRule("ZZ").code, "ZZ");
  assert.deepEqual(validateStoreAddress({ name: "Ann Lee", phone: "12345678", line1: "Some street 1", city: "Town", country: "ZZ" }), {});
});

test("isValidEmail", () => {
  assert.equal(isValidEmail("sara@example.com"), true);
  assert.equal(isValidEmail(" sara@example.com "), true);
  assert.equal(isValidEmail("sara@example"), false);
  assert.equal(isValidEmail("sara example@x.com"), false);
});

test("normalizeAddress trims, folds digits and sends E.164", () => {
  const out = normalizeAddress({ ...egypt, name: "  Sara   Ahmed ", postalCode: "١١٧٦٥", country: "eg", phone: "0100 123 4567" });
  assert.deepEqual([out.name, out.postalCode, out.country, out.phone], ["Sara Ahmed", "11765", "EG", "+201001234567"]);
});

test("storeAddressLines follow the country's order", () => {
  assert.deepEqual(storeAddressLines({ ...egypt, line2: "Floor 3", region: "Nasr City", postalCode: "11765" }), ["12 Palm Street", "Floor 3", "Cairo, Nasr City, 11765"]);
  assert.deepEqual(storeAddressLines({ line1: "Unter den Linden 1", city: "Berlin", postalCode: "10115", country: "DE" }), ["Unter den Linden 1", "10115 Berlin"]);
});

/* ------------------------------------------------------------------ state machine */

const methods = [{ id: "standard", label: "Standard", price: 6000, freeOver: 150000, etaDays: [3, 5] }, { id: "express", label: "Express", price: 12000, etaDays: [1, 2] }];
const ctx = { shippingMethodIds: ["standard", "express"], signedIn: false, cardValid: true, localReady: false, paymentAvailable: { card: true, cod: true, local: true, wallet: false } };

const filled = () =>
  emptyCheckoutData({
    contact: { mode: "guest", email: "sara@example.com" },
    shipping: { ...egypt, postalCode: "11765" },
    shippingMethodId: "standard",
    payment: { kind: "card" },
  });

test("a fresh checkout opens on contact with nothing done", () => {
  const s = initialCheckout();
  assert.deepEqual([s.status, s.section, s.done.length, s.attempts], ["editing", "contact", 0, 0]);
});

test("validateSection: contact", () => {
  const d = emptyCheckoutData();
  assert.deepEqual(validateSection("contact", d, ctx), { "contact.email": "required" });
  assert.deepEqual(validateSection("contact", { ...d, contact: { mode: "guest", email: "nope" } }, ctx), { "contact.email": "email" });
  assert.deepEqual(validateSection("contact", { ...d, contact: { mode: "account", email: "" } }, ctx), { "contact.account": "signIn" });
  assert.deepEqual(validateSection("contact", { ...d, contact: { mode: "account", email: "" } }, { ...ctx, signedIn: true }), {});
});

test("validateSection: address includes billing only when it differs", () => {
  const d = filled();
  assert.deepEqual(validateSection("address", d, ctx), {});
  const diff = { ...d, billingSame: false, billing: { country: "EG" } };
  assert.deepEqual(Object.keys(validateSection("address", diff, ctx)).sort(), ["billing.city", "billing.line1", "billing.name"]);
});

test("validateSection: delivery and payment", () => {
  const d = filled();
  assert.deepEqual(validateSection("delivery", { ...d, shippingMethodId: undefined }, ctx), { "delivery.method": "required" });
  assert.deepEqual(validateSection("delivery", { ...d, shippingMethodId: "drone" }, ctx), { "delivery.method": "unavailable" });
  assert.deepEqual(validateSection("delivery", { ...d, gift: { enabled: true, message: "x".repeat(201), wrap: false, hidePrices: true } }, ctx), { "gift.message": "tooLong" });
  assert.deepEqual(validateSection("delivery", { ...d, notes: "x".repeat(501) }, ctx), { notes: "tooLong" });
  assert.deepEqual(validateSection("payment", { ...d, payment: {} }, ctx), { "payment.kind": "required" });
  assert.deepEqual(validateSection("payment", { ...d, payment: { kind: "wallet" } }, ctx), { "payment.kind": "unavailable" });
  assert.deepEqual(validateSection("payment", d, { ...ctx, cardValid: false }), { "payment.card": "invalid" });
  assert.deepEqual(validateSection("payment", { ...d, payment: { kind: "local" } }, ctx), { "payment.local": "required" });
  assert.deepEqual(validateSection("payment", { ...d, payment: { kind: "local" } }, { ...ctx, localReady: true }), {});
  assert.deepEqual(validateSection("payment", { ...d, payment: { kind: "cod" } }, { ...ctx, cardValid: false }), {});
});

test("continue validates the open section, then opens the next", () => {
  let s = initialCheckout();
  s = checkoutReduce(s, { type: "continue" }, ctx);
  assert.equal(s.section, "contact");
  assert.equal(s.errors["contact.email"], "required");
  s = checkoutReduce(s, { type: "update", patch: { contact: { mode: "guest", email: "sara@example.com" } } }, ctx);
  assert.deepEqual(s.errors, {});
  s = checkoutReduce(s, { type: "continue" }, ctx);
  assert.deepEqual([s.section, [...s.done]], ["address", ["contact"]]);
});

test("sections cannot be skipped, finished ones can be reopened", () => {
  let s = initialCheckout();
  assert.equal(checkoutReduce(s, { type: "open", section: "payment" }, ctx).section, "contact");
  s = checkoutReduce(s, { type: "update", patch: filled() }, ctx);
  s = checkoutReduce(s, { type: "continue" }, ctx);
  s = checkoutReduce(s, { type: "continue" }, ctx);
  assert.equal(s.section, "delivery");
  assert.equal(checkoutReduce(s, { type: "open", section: "contact" }, ctx).section, "contact");
  assert.equal(checkoutReduce(s, { type: "open", section: "payment" }, ctx).section, "delivery");
});

test("editing a finished section so it is invalid reopens it", () => {
  let s = initialCheckout(filled());
  for (let i = 0; i < 3; i += 1) s = checkoutReduce(s, { type: "continue" }, ctx);
  assert.deepEqual([...s.done], ["contact", "address", "delivery"]);
  s = checkoutReduce(s, { type: "update", patch: { shipping: { ...egypt, city: "" } } }, ctx);
  assert.deepEqual([...s.done], ["contact", "delivery"]);
  assert.equal(nextOpenSection(s.done), "address");
});

test("errors that are fixed disappear on update", () => {
  let s = initialCheckout();
  s = checkoutReduce(s, { type: "continue" }, ctx);
  assert.ok(s.errors["contact.email"]);
  s = checkoutReduce(s, { type: "update", patch: { contact: { mode: "guest", email: "a@b.co" } } }, ctx);
  assert.equal(s.errors["contact.email"], undefined);
});

test("submit with a problem jumps to that section and shows every error", () => {
  const d = filled();
  d.shipping = { ...egypt, phone: "1" };
  let s = initialCheckout(d);
  s = checkoutReduce(s, { type: "submit" }, ctx);
  assert.equal(s.status, "editing");
  assert.equal(s.section, "address");
  assert.equal(s.errors["shipping.phone"], "phone");
  assert.equal(canPlaceOrder(s, ctx), false);
  assert.equal(firstInvalidSection(s.data, ctx), "address");
});

test("submit, fail, retry and succeed", () => {
  let s = initialCheckout(filled());
  assert.equal(canPlaceOrder(s, ctx), true);
  s = checkoutReduce(s, { type: "submit" }, ctx);
  assert.deepEqual([s.status, s.attempts, [...s.done].length], ["submitting", 1, 4]);
  // Double clicks and edits are ignored while sending.
  assert.equal(checkoutReduce(s, { type: "submit" }, ctx), s);
  assert.equal(checkoutReduce(s, { type: "update", patch: { notes: "hi" } }, ctx), s);
  s = checkoutReduce(s, { type: "failed", reason: "declined" }, ctx);
  assert.deepEqual([s.status, s.failure], ["failed", "declined"]);
  assert.equal(canPlaceOrder(s, ctx), true);
  s = checkoutReduce(s, { type: "submit" }, ctx);
  assert.deepEqual([s.status, s.attempts, s.failure], ["submitting", 2, undefined]);
  s = checkoutReduce(s, { type: "succeeded", orderNumber: "#1050" }, ctx);
  assert.deepEqual([s.status, s.orderNumber], ["placed", "#1050"]);
  assert.equal(checkoutReduce(s, { type: "update", patch: { notes: "late" } }, ctx), s);
  assert.equal(canPlaceOrder(s, ctx), false);
});

test("a failed order keeps its data and dismiss returns to editing", () => {
  let s = initialCheckout(filled());
  s = checkoutReduce(s, { type: "submit" }, ctx);
  s = checkoutReduce(s, { type: "failed", reason: "network" }, ctx);
  s = checkoutReduce(s, { type: "dismiss" }, ctx);
  assert.deepEqual([s.status, s.failure, s.data.contact.email], ["editing", undefined, "sara@example.com"]);
  assert.equal(validateCheckout(s.data, ctx) && Object.keys(validateCheckout(s.data, ctx)).length, 0);
});

/* ------------------------------------------------------------------ payment, totals, ETA, order */

test("paymentAvailability: cash on delivery limits and countries", () => {
  const policy = { card: true, cod: { maxTotal: 500000, countries: ["EG"], fee: 2500 }, wallet: { balance: 200000 }, local: [{ id: "insta", max: 300000 }, { id: "bank", min: 400000 }] };
  const a = paymentAvailability(policy, { total: 100000, country: "EG" });
  assert.deepEqual([a.card.available, a.cod.available, a.wallet.available, a.local.available], [true, true, true, true]);
  const big = paymentAvailability(policy, { total: 600000, country: "EG" });
  assert.deepEqual([big.cod.reason, big.cod.amount, big.wallet.reason, big.wallet.amount], ["cod-limit", 500000, "wallet-balance", 400000]);
  assert.equal(paymentAvailability(policy, { total: 100000, country: "sa" }).cod.reason, "cod-country");
  assert.equal(paymentAvailability(policy, { total: 350000, country: "EG" }).local.reason, "local-limit");
  const none = paymentAvailability({}, { total: 100, country: "EG" });
  assert.deepEqual([none.card.available, none.cod.reason, none.wallet.reason, none.local.reason], [true, "not-offered", "not-offered", "not-offered"]);
  assert.equal(paymentAvailability({ card: false }, { total: 1, country: "EG" }).card.available, false);
});

const lines = [
  { id: "a", productId: "p", variantId: "va", name: "A", unitPrice: 50000, compareAt: 60000, quantity: 2 },
  { id: "b", productId: "q", variantId: "vb", name: "B", unitPrice: 20000, quantity: 1 },
  { id: "c", productId: "r", variantId: "vc", name: "C", unitPrice: 99999, quantity: 1, savedForLater: true },
];

test("checkoutSummary adds the COD and gift-wrap fees on top of commerceTotals", () => {
  const base = checkoutSummary({ lines, shippingMethod: methods[0], paymentKind: "card" });
  assert.deepEqual([base.subtotal, base.shipping, base.total, base.codFee, base.payable, base.itemCount, base.savings], [120000, 6000, 126000, 0, 126000, 3, 20000]);
  const cod = checkoutSummary({ lines, shippingMethod: methods[0], paymentKind: "cod", policy: { cod: { fee: 2500 } }, giftWrap: true, giftWrapFee: 3000, discount: 10000 });
  assert.deepEqual([cod.discount, cod.total, cod.codFee, cod.giftWrapFee, cod.payable], [10000, 116000, 2500, 3000, 121500]);
  const free = checkoutSummary({ lines, shippingMethod: { ...methods[0], freeOver: 100000 }, paymentKind: "card" });
  assert.equal(free.shipping, 0);
  const tax = checkoutSummary({ lines, taxBps: 1400, paymentKind: "card" });
  assert.deepEqual([tax.tax, tax.payable], [16800, 136800]);
  const wrapOff = checkoutSummary({ lines, giftWrap: false, giftWrapFee: 3000 });
  assert.equal(wrapOff.giftWrapFee, 0);
});

test("etaWindow counts calendar days, and can skip a weekend", () => {
  const from = new Date("2026-09-30T10:00:00Z"); // Wednesday
  const w = etaWindow([3, 5], from);
  assert.deepEqual([w.start.toISOString().slice(0, 10), w.end.toISOString().slice(0, 10)], ["2026-10-03", "2026-10-05"]);
  const eg = etaWindow([1, 3], from, [5, 6]); // Friday and Saturday do not count
  assert.deepEqual([eg.start.toISOString().slice(0, 10), eg.end.toISOString().slice(0, 10)], ["2026-10-01", "2026-10-05"]);
  const swapped = etaWindow([5, 3], from);
  assert.ok(swapped.start <= swapped.end);
  const same = etaWindow([0, 0], from);
  assert.equal(same.start.toISOString().slice(0, 10), "2026-09-30");
});

test("buildOrder makes a pending order, or a cod one, from the checkout", () => {
  const data = filled();
  data.notes = "Leave with the doorman";
  data.gift = { enabled: true, message: "Happy birthday", wrap: true, hidePrices: true };
  const summary = checkoutSummary({ lines, shippingMethod: methods[0], paymentKind: "card", giftWrap: true, giftWrapFee: 3000 });
  const now = new Date("2026-09-30T12:00:00Z");
  const order = buildOrder({ data, lines, summary, shippingMethod: methods[0], number: "#1050", now });
  assert.deepEqual([order.number, order.status, order.payment, order.lines.length, order.totals.total, order.customer.name, order.customer.phone], ["#1050", "pending", "paid", 2, 129000, "Sara Ahmed", "+201001234567"]);
  assert.equal(order.shippingAddress.phone, "+201001234567");
  assert.deepEqual(order.billingAddress, order.shippingAddress);
  assert.match(order.notes, /Leave with the doorman\nGift: Happy birthday/);
  const cod = buildOrder({ data: { ...data, payment: { kind: "cod" } }, lines, summary, number: "#1051", now });
  assert.equal(cod.payment, "cod");
  const local = buildOrder({ data: { ...data, payment: { kind: "local" } }, lines, summary, number: "#1052", now });
  assert.equal(local.payment, "pending");
});
