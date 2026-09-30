import assert from "node:assert/strict";
import { test } from "node:test";
import "./_ts-resolve.mjs";

const {
  cartActiveLines,
  cartAdd,
  cartBlockers,
  cartCheapestShipping,
  cartCount,
  cartFixOverStock,
  cartItemFromProduct,
  cartMoveToCart,
  cartRemove,
  cartRestore,
  cartSaveForLater,
  cartSavedLines,
  cartSetQuantity,
  cartShippingOptions,
  cartStockIssue,
  matchShippingZone,
  normalizePlace,
} = await import("../src/components/store-cart/cart-logic.ts");

const line = (id, over = {}) => ({ id, productId: `p-${id}`, variantId: `v-${id}`, name: id, unitPrice: 1000, quantity: 1, maxQuantity: 10, ...over });

test("cartSetQuantity clamps to the line limit and to 1", () => {
  const lines = [line("a", { quantity: 2, maxQuantity: 4 })];
  const up = cartSetQuantity(lines, "a", 9);
  assert.deepEqual([up.quantity, up.clamped, up.changed], [4, true, true]);
  const down = cartSetQuantity(lines, "a", 0);
  assert.deepEqual([down.quantity, down.clamped], [1, false]);
  assert.equal(cartSetQuantity(lines, "a", Number.NaN).quantity, 1);
  assert.equal(cartSetQuantity(lines, "a", 2.9).quantity, 2);
  const same = cartSetQuantity(lines, "a", 2);
  assert.equal(same.changed, false);
  assert.equal(cartSetQuantity(lines, "missing", 3).changed, false);
});

test("cartSetQuantity does not mutate its input", () => {
  const lines = [line("a")];
  cartSetQuantity(lines, "a", 5);
  assert.equal(lines[0].quantity, 1);
});

test("cartAdd merges the same variant and clamps the total", () => {
  const start = [line("a", { quantity: 3, maxQuantity: 4 })];
  const added = cartAdd(start, { productId: "p-a", variantId: "v-a", name: "a", unitPrice: 1000, maxQuantity: 4 }, 3);
  assert.equal(added.lines.length, 1);
  assert.deepEqual([added.quantity, added.clamped], [4, true]);
  const fresh = cartAdd(start, { productId: "p-b", variantId: "v-b", name: "b", unitPrice: 500 }, 2);
  assert.equal(fresh.lines.length, 2);
  assert.equal(fresh.line.id, "line-v-b");
  assert.equal(fresh.quantity, 2);
});

test("cartAdd brings a saved line back into the cart", () => {
  const start = [line("a", { savedForLater: true, quantity: 2 })];
  const added = cartAdd(start, { productId: "p-a", variantId: "v-a", name: "a", unitPrice: 1000, maxQuantity: 10 }, 1);
  assert.equal(added.lines[0].savedForLater, false);
  assert.equal(added.quantity, 1);
});

test("cartRemove and cartRestore put the line back where it was", () => {
  const lines = [line("a"), line("b"), line("c")];
  const { lines: after, removed } = cartRemove(lines, "b");
  assert.deepEqual(after.map((l) => l.id), ["a", "c"]);
  assert.equal(removed.index, 1);
  assert.deepEqual(cartRestore(after, removed).map((l) => l.id), ["a", "b", "c"]);
  assert.equal(cartRemove(lines, "zzz").removed, undefined);
});

test("cartRestore merges when the variant was added again", () => {
  const lines = [line("a", { quantity: 2, maxQuantity: 3 })];
  const { removed } = cartRemove(lines, "a");
  const again = [line("a", { id: "line-new", quantity: 2, maxQuantity: 3 })];
  const back = cartRestore(again, removed);
  assert.equal(back.length, 1);
  assert.equal(back[0].quantity, 3);
});

test("save for later and move back", () => {
  const lines = [line("a", { quantity: 2 }), line("b")];
  const saved = cartSaveForLater(lines, "a");
  assert.deepEqual(cartSavedLines(saved).map((l) => l.id), ["a"]);
  assert.equal(cartCount(saved), 1);
  const back = cartMoveToCart(saved, "a");
  assert.equal(cartSavedLines(back).length, 0);
  assert.equal(cartCount(back), 3);
});

test("moving a saved line merges into an active twin", () => {
  const lines = [line("a", { quantity: 2, maxQuantity: 3 }), line("a", { id: "a2", quantity: 2, maxQuantity: 3, savedForLater: true })];
  const back = cartMoveToCart(lines, "a2");
  assert.equal(back.length, 1);
  assert.equal(back[0].quantity, 3);
});

test("cartStockIssue: out, over, low and untracked", () => {
  assert.deepEqual(cartStockIssue(line("a", { maxQuantity: 0 })), { kind: "out" });
  assert.deepEqual(cartStockIssue(line("a", { quantity: 5, maxQuantity: 3 })), { kind: "over", available: 3 });
  assert.deepEqual(cartStockIssue(line("a", { quantity: 1, maxQuantity: 4 })), { kind: "low", available: 4 });
  assert.equal(cartStockIssue(line("a", { quantity: 1, maxQuantity: 12 })), undefined);
  assert.equal(cartStockIssue(line("a", { maxQuantity: undefined })), undefined);
  assert.equal(cartStockIssue(line("a", { maxQuantity: 8 }), 8)?.kind, "low");
});

test("cartBlockers ignores saved lines and low-stock nudges", () => {
  const lines = [line("a", { maxQuantity: 0 }), line("b", { quantity: 2, maxQuantity: 3 }), line("c", { quantity: 6, maxQuantity: 3, savedForLater: true }), line("d", { quantity: 4, maxQuantity: 2 })];
  assert.deepEqual(cartBlockers(lines).map((l) => l.id), ["a", "d"]);
  const fixed = cartFixOverStock(lines);
  assert.equal(fixed.find((l) => l.id === "d").quantity, 2);
  assert.equal(fixed.find((l) => l.id === "a").quantity, 1);
  assert.equal(cartActiveLines(lines).length, 3);
});

test("normalizePlace folds English and Arabic spellings", () => {
  assert.equal(normalizePlace("  Cairo "), "cairo");
  assert.equal(normalizePlace("القاهرة"), normalizePlace("قاهره"));
  assert.equal(normalizePlace("الإسكندرية"), normalizePlace("اسكندريه"));
  assert.equal(normalizePlace("Alexandria!"), "alexandria");
  assert.equal(normalizePlace(""), "");
});

const zones = [
  { id: "cairo", label: "Greater Cairo", cities: ["Cairo", "Giza", "القاهرة", "الجيزة"], methods: [{ id: "std", label: "Standard", price: 6000, freeOver: 150000, etaDays: [1, 2] }, { id: "exp", label: "Express", price: 12000 }] },
  { id: "delta", label: "Delta", cities: ["Mansoura", "Tanta"], methods: [{ id: "std", label: "Standard", price: 9000, etaDays: [3, 5] }] },
];

test("matchShippingZone finds a zone by any spelling", () => {
  assert.equal(matchShippingZone(zones, "cairo").id, "cairo");
  assert.equal(matchShippingZone(zones, "  GIZA ").id, "cairo");
  assert.equal(matchShippingZone(zones, "قاهره").id, "cairo");
  assert.equal(matchShippingZone(zones, "الجيزة").id, "cairo");
  assert.equal(matchShippingZone(zones, "Tanta").id, "delta");
  assert.equal(matchShippingZone(zones, "Paris"), undefined);
  assert.equal(matchShippingZone(zones, "   "), undefined);
});

test("cartShippingOptions applies the free-over rule and reports what is left", () => {
  const low = cartShippingOptions(zones[0], 100000);
  assert.deepEqual(low.map((o) => [o.method.id, o.cost, o.free, o.remaining]), [["std", 6000, false, 50000], ["exp", 12000, false, undefined]]);
  const high = cartShippingOptions(zones[0], 150000);
  assert.deepEqual(high.map((o) => [o.cost, o.free]), [[0, true], [12000, false]]);
  assert.equal(cartCheapestShipping(high).method.id, "std");
  assert.deepEqual(cartShippingOptions(undefined, 1), []);
  assert.equal(cartCheapestShipping([]), undefined);
});

test("cartItemFromProduct picks the variant, or the first in stock, and labels it", () => {
  const product = {
    id: "p", name: "Tee", images: [{ src: "/a.svg", alt: "Tee" }],
    options: [{ id: "c", name: "Colour", values: [{ id: "black", label: "Black" }, { id: "white", label: "White" }] }, { id: "s", name: "Size", values: [{ id: "M", label: "M" }] }],
    variants: [
      { id: "v1", options: { c: "black", s: "M" }, price: 1000, stock: 0 },
      { id: "v2", options: { c: "white", s: "M" }, price: 900, compareAt: 1200, stock: 3, image: "/w.svg" },
    ],
  };
  const auto = cartItemFromProduct(product);
  assert.deepEqual([auto.variantId, auto.variantLabel, auto.image, auto.compareAt, auto.maxQuantity], ["v2", "White · M", "/w.svg", 1200, 3]);
  assert.equal(cartItemFromProduct(product, "v1"), undefined);
  assert.equal(cartItemFromProduct({ ...product, variants: [product.variants[0]] }), undefined);
  assert.equal(cartItemFromProduct({ ...product, variants: [{ ...product.variants[0], allowBackorder: true }] }).maxQuantity, undefined);
});
