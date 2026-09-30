import assert from "node:assert/strict";
import { test } from "node:test";
import "./_ts-resolve.mjs";

const {
  autoSelectSingle, clampPurchaseQuantity, deliveryWindow, displayPrice, galleryIndexForImage, imageForSelection, initialSelection,
  maxPurchasable, missingOptions, resolveSwipe, selectOptionValue, selectionLabel, stepIndex, stockState, zoomOrigin,
} = await import("../src/components/product-detail/pdp-logic.ts");

const v = (id, colour, size, extra = {}) => ({ id, options: size ? { colour, size } : { colour }, price: 10000, ...extra });
const tee = {
  id: "tee", name: "Tee", images: [{ src: "/a-red.svg", alt: "" }, { src: "/a-blue.svg", alt: "" }],
  options: [
    { id: "colour", name: "Colour", values: [{ id: "red", label: "Red", image: "/a-red.svg" }, { id: "blue", label: "Blue", image: "/a-blue.svg" }, { id: "green", label: "Green" }] },
    { id: "size", name: "Size", values: [{ id: "s", label: "S" }, { id: "m", label: "M" }, { id: "l", label: "L" }] },
  ],
  variants: [
    v("red-s", "red", "s", { stock: 0 }), v("red-m", "red", "m", { stock: 4 }), v("red-l", "red", "l", { stock: 9 }),
    v("blue-s", "blue", "s", { stock: 3 }), v("blue-m", "blue", "m", { stock: 0 }),
    v("green-l", "green", "l", { stock: 2, image: "/green-l.svg", price: 8000, compareAt: 10000 }),
  ],
};

test("initialSelection prefers the requested variant, then the first in-stock one", () => {
  assert.deepEqual(initialSelection(tee), { colour: "red", size: "m" });
  assert.deepEqual(initialSelection(tee, { variantId: "blue-s" }), { colour: "blue", size: "s" });
  assert.deepEqual(initialSelection(tee, { variantId: "nope" }), { colour: "red", size: "m" });
  const soldOut = { ...tee, variants: tee.variants.map((x) => ({ ...x, stock: 0 })) };
  assert.deepEqual(initialSelection(soldOut), { colour: "red", size: "s" });
  assert.deepEqual(initialSelection({ ...tee, variants: [] }), {});
});

test("initialSelection blank opens empty but keeps lone values", () => {
  assert.deepEqual(initialSelection(tee, { blank: true }), {});
  const oneColour = { ...tee, options: [{ id: "colour", name: "Colour", values: [{ id: "red", label: "Red" }] }, tee.options[1]], variants: tee.variants.filter((x) => x.options.colour === "red") };
  assert.deepEqual(initialSelection(oneColour, { blank: true }), { colour: "red" });
});

test("autoSelectSingle picks a lone reachable value and chains", () => {
  assert.deepEqual(autoSelectSingle(tee, { colour: "green" }), { colour: "green", size: "l" });
  assert.deepEqual(autoSelectSingle(tee, { colour: "blue" }), { colour: "blue" });
  assert.deepEqual(autoSelectSingle(tee, { size: "l" }), { size: "l" });
  const chain = {
    ...tee,
    options: [...tee.options, { id: "fit", name: "Fit", values: [{ id: "slim", label: "Slim" }, { id: "wide", label: "Wide" }] }],
    variants: [
      { id: "1", options: { colour: "red", size: "m", fit: "slim" }, price: 1, stock: 1 },
      { id: "2", options: { colour: "blue", size: "m", fit: "wide" }, price: 1, stock: 1 },
    ],
  };
  // Size has one value everywhere, so it is picked; then colour=red leaves one fit.
  assert.deepEqual(autoSelectSingle(chain, { colour: "red" }), { colour: "red", size: "m", fit: "slim" });
});

test("autoSelectSingle does not mutate its input", () => {
  const input = { colour: "green" };
  autoSelectSingle(tee, input);
  assert.deepEqual(input, { colour: "green" });
});

test("selectOptionValue drops picks that no longer combine, and the new pick wins", () => {
  assert.deepEqual(selectOptionValue(tee, { colour: "red", size: "l" }, "colour", "blue"), { colour: "blue" });
  assert.deepEqual(selectOptionValue(tee, { colour: "red", size: "s" }, "colour", "blue"), { colour: "blue", size: "s" });
  assert.deepEqual(selectOptionValue(tee, { colour: "red", size: "m" }, "colour", "green"), { colour: "green", size: "l" });
  assert.deepEqual(selectOptionValue(tee, { colour: "blue" }, "size", "l"), { size: "l" });
});

test("selectOptionValue ignores unknown axes and values", () => {
  const sel = { colour: "red" };
  assert.equal(selectOptionValue(tee, sel, "nope", "x"), sel);
  assert.equal(selectOptionValue(tee, sel, "colour", "purple"), sel);
});

test("missingOptions and selectionLabel", () => {
  assert.deepEqual(missingOptions(tee, { colour: "red" }).map((o) => o.id), ["size"]);
  assert.deepEqual(missingOptions(tee, { colour: "red", size: "m" }), []);
  assert.equal(selectionLabel(tee, { colour: "red", size: "m" }), "Red · M");
  assert.equal(selectionLabel(tee, { size: "m" }), "M");
  assert.equal(selectionLabel(tee, {}), "");
});

test("imageForSelection: variant image, then colour value image, else undefined", () => {
  const green = tee.variants.find((x) => x.id === "green-l");
  assert.equal(imageForSelection(tee, { colour: "green", size: "l" }, green), "/green-l.svg");
  assert.equal(imageForSelection(tee, { colour: "blue" }), "/a-blue.svg");
  assert.equal(imageForSelection(tee, { colour: "green" }), undefined);
  assert.equal(imageForSelection(tee, {}), undefined);
});

test("galleryIndexForImage", () => {
  assert.equal(galleryIndexForImage(tee.images, "/a-blue.svg"), 1);
  assert.equal(galleryIndexForImage(tee.images, "/x.svg"), -1);
  assert.equal(galleryIndexForImage(tee.images, undefined), -1);
});

test("stockState", () => {
  assert.deepEqual(stockState(undefined), { kind: "unavailable" });
  assert.deepEqual(stockState({ id: "a", options: {}, price: 1 }), { kind: "untracked" });
  assert.deepEqual(stockState({ id: "a", options: {}, price: 1, stock: 0 }), { kind: "out" });
  assert.deepEqual(stockState({ id: "a", options: {}, price: 1, stock: 0, allowBackorder: true }), { kind: "backorder" });
  assert.deepEqual(stockState({ id: "a", options: {}, price: 1, stock: 5 }), { kind: "low", left: 5 });
  assert.deepEqual(stockState({ id: "a", options: {}, price: 1, stock: 6 }), { kind: "in-stock", left: 6 });
  assert.deepEqual(stockState({ id: "a", options: {}, price: 1, stock: 12 }, 10), { kind: "in-stock", left: 12 });
  assert.deepEqual(stockState({ id: "a", options: {}, price: 1, stock: 12 }, 15), { kind: "low", left: 12 });
});

test("maxPurchasable and clampPurchaseQuantity", () => {
  const red = tee.variants[1];
  assert.equal(maxPurchasable(red), 4);
  assert.equal(maxPurchasable(red, 2), 2);
  assert.equal(maxPurchasable(red, 10), 4);
  assert.equal(maxPurchasable({ id: "a", options: {}, price: 1 }), undefined);
  assert.equal(maxPurchasable({ id: "a", options: {}, price: 1 }, 6), 6);
  assert.equal(maxPurchasable({ id: "a", options: {}, price: 1, stock: 1, allowBackorder: true }), undefined);
  assert.equal(maxPurchasable(undefined, 3), 3);
  assert.equal(clampPurchaseQuantity(99, red), 4);
  assert.equal(clampPurchaseQuantity(0, red), 1);
  assert.equal(clampPurchaseQuantity(Number.NaN, red), 1);
  assert.equal(clampPurchaseQuantity(2.9, red), 2);
  assert.equal(clampPurchaseQuantity(99, tee.variants[0]), 1);
});

test("displayPrice: variant price with percent off, or lowest 'from' price", () => {
  const green = tee.variants.find((x) => x.id === "green-l");
  assert.deepEqual(displayPrice(tee, green), { price: 8000, compareAt: 10000, percentOff: 20, from: false });
  assert.deepEqual(displayPrice(tee, tee.variants[1]), { price: 10000, percentOff: 0, from: false });
  const d = displayPrice(tee, undefined);
  assert.equal(d.price, 8000);
  assert.equal(d.from, true);
  assert.equal(d.percentOff, 20);
  assert.equal(displayPrice({ ...tee, variants: [] }, undefined).price, 0);
});

test("deliveryWindow counts calendar days, skips weekdays and honours the cutoff", () => {
  // 2026-09-30 is a Wednesday.
  assert.deepEqual(deliveryWindow("2026-09-30T09:00:00Z", [2, 4]), { from: "2026-10-02", to: "2026-10-04" });
  // Skipping Friday (5) and Saturday (6): Thu 1, then Fri/Sat skipped, Sun 4 is day 2, Mon 5 is day 3, Tue 6 is day 4.
  assert.deepEqual(deliveryWindow("2026-09-30T09:00:00Z", [2, 4], { skipWeekdays: [5, 6] }), { from: "2026-10-04", to: "2026-10-06" });
  assert.deepEqual(deliveryWindow("2026-09-30T18:00:00Z", [1, 1], { cutoffHour: 14 }), { from: "2026-10-02", to: "2026-10-02" });
  assert.deepEqual(deliveryWindow("2026-09-30T09:00:00Z", [0, 1], { cutoffHour: 14 }), { from: "2026-09-30", to: "2026-10-01" });
  // Reversed ranges are normalised; zero days that land on a skipped day move on.
  assert.deepEqual(deliveryWindow("2026-09-30T09:00:00Z", [4, 2]), { from: "2026-10-02", to: "2026-10-04" });
  assert.deepEqual(deliveryWindow("2026-10-02T09:00:00Z", [0, 0], { skipWeekdays: [5, 6] }), { from: "2026-10-04", to: "2026-10-04" });
  // Skipping every weekday must not loop forever.
  assert.equal(typeof deliveryWindow("2026-09-30", [1, 2], { skipWeekdays: [0, 1, 2, 3, 4, 5, 6] }).from, "string");
});

test("resolveSwipe follows reading direction and ignores scrolls and taps", () => {
  assert.equal(resolveSwipe(-80, 5), "next");
  assert.equal(resolveSwipe(80, 5), "prev");
  assert.equal(resolveSwipe(-80, 5, { rtl: true }), "prev");
  assert.equal(resolveSwipe(80, 5, { rtl: true }), "next");
  assert.equal(resolveSwipe(-20, 0), null);
  assert.equal(resolveSwipe(-60, 80), null);
  assert.equal(resolveSwipe(-60, 40), "next");
  assert.equal(resolveSwipe(-30, 0, { threshold: 20 }), "next");
});

test("stepIndex wraps both ways", () => {
  assert.equal(stepIndex(0, -1, 4), 3);
  assert.equal(stepIndex(3, 1, 4), 0);
  assert.equal(stepIndex(1, 5, 4), 2);
  assert.equal(stepIndex(2, -7, 4), 3);
  assert.equal(stepIndex(0, 1, 0), 0);
});

test("zoomOrigin clamps to the box", () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };
  assert.deepEqual(zoomOrigin(200, 100, rect), { x: 50, y: 50 });
  assert.deepEqual(zoomOrigin(0, 999, rect), { x: 0, y: 100 });
  assert.deepEqual(zoomOrigin(10, 10, { left: 0, top: 0, width: 0, height: 0 }), { x: 50, y: 50 });
});
