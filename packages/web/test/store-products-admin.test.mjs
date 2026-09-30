import assert from "node:assert/strict";
import { test } from "node:test";
import {
  draftChanged,
  draftToProduct,
  emptyProductDraft,
  productToDraft,
  bulkEditProducts,
  bulkFillVariants,
  bulkPrice,
  collectionsOfProduct,
  decimalToMinor,
  duplicateSkus,
  generateVariants,
  marginFromCost,
  matchCollection,
  moveItem,
  optionCombinations,
  optionValuesFromLabels,
  priceForMargin,
  slugify,
  stockSummary,
  validateProductDraft,
  variantCount,
  variantLabel,
} from "../src/components/store-products-admin/product-admin-logic.ts";

const colour = { id: "colour", name: "Colour", values: [{ id: "red", label: "Red" }, { id: "blue", label: "Blue" }] };
const size = { id: "size", name: "Size", values: [{ id: "m", label: "M" }, { id: "l", label: "L" }] };
const defaults = { price: 1000 };

test("generates the cartesian product in option order", () => {
  const { variants, created, truncated } = generateVariants([colour, size], [], { defaults, skuBase: "TEE" });
  assert.equal(variants.length, 4);
  assert.deepEqual(variants.map((v) => v.options), [
    { colour: "red", size: "m" }, { colour: "red", size: "l" }, { colour: "blue", size: "m" }, { colour: "blue", size: "l" },
  ]);
  assert.equal(variants[0].sku, "TEE-RED-M");
  assert.equal(created.length, 4);
  assert.equal(truncated, false);
  assert.equal(variantCount([colour, size]), 4);
  assert.equal(variantCount([]), 0);
  assert.equal(variantCount([{ id: "x", name: "X", values: [] }, size]), 2);
});

test("keeps typed data when a value is added and drops it when a value is removed", () => {
  const first = generateVariants([colour, size], [], { defaults }).variants;
  first[0] = { ...first[0], price: 1500, sku: "MINE", stock: 7, image: "/a.svg" };
  const green = { id: "green", label: "Green" };
  const added = generateVariants([{ ...colour, values: [...colour.values, green] }, size], first, { defaults });
  assert.equal(added.variants.length, 6);
  assert.equal(added.created.length, 2);
  const kept = added.variants.find((v) => v.options.colour === "red" && v.options.size === "m");
  assert.equal(kept.price, 1500);
  assert.equal(kept.sku, "MINE");
  assert.equal(kept.stock, 7);
  assert.equal(kept.image, "/a.svg");
  assert.equal(added.dropped.length, 0);
  const removed = generateVariants([{ ...colour, values: [colour.values[1]] }, size], first, { defaults });
  assert.equal(removed.variants.length, 2);
  assert.deepEqual(removed.dropped.map((v) => v.options.colour), ["red", "red"]);
});

test("a new option axis moves existing variants onto its first value", () => {
  const base = generateVariants([colour], [], { defaults }).variants.map((v, i) => ({ ...v, price: 2000 + i, stock: 3 }));
  const next = generateVariants([colour, size], base, { defaults: { price: 1 } });
  assert.equal(next.variants.length, 4);
  const redM = next.variants.find((v) => v.options.colour === "red" && v.options.size === "m");
  const redL = next.variants.find((v) => v.options.colour === "red" && v.options.size === "l");
  assert.equal(redM.price, 2000);
  assert.equal(redM.stock, 3);
  assert.equal(redL.price, 1);
  assert.equal(next.created.length, 2);
  assert.equal(new Set(next.variants.map((v) => v.id)).size, 4);
});

test("removing an axis collapses variants; the first wins and the rest are dropped", () => {
  const two = generateVariants([colour, size], [], { defaults }).variants.map((v, i) => ({ ...v, price: 100 * (i + 1) }));
  const one = generateVariants([colour], two, { defaults });
  assert.equal(one.variants.length, 2);
  assert.deepEqual(one.variants.map((v) => v.price), [100, 300]);
  assert.equal(one.dropped.length, 2);
});

test("renaming a label keeps the id, so variants survive; reorder keeps data", () => {
  const values = optionValuesFromLabels(colour, ["Blue", "Red", "Green", "red", " "]);
  assert.deepEqual(values.map((v) => v.id), ["blue", "red", "green"]);
  const vs = generateVariants([colour, size], [], { defaults }).variants.map((v) => ({ ...v, sku: `S-${v.id}` }));
  const reordered = generateVariants([{ ...colour, values }, size], vs, { defaults });
  assert.equal(reordered.variants.length, 6);
  assert.equal(reordered.variants.find((v) => v.options.colour === "blue" && v.options.size === "l").sku, "S-v-blue-l");
});

test("new value ids never collide with an existing one", () => {
  const values = optionValuesFromLabels({ id: "c", name: "C", values: [{ id: "red-2", label: "Crimson" }] }, ["Crimson", "Red 2"]);
  assert.deepEqual(values.map((v) => v.id), ["red-2", "red-2-2"]);
});

test("limit truncates and reports it", () => {
  const big = { id: "n", name: "N", values: Array.from({ length: 12 }, (_, i) => ({ id: `v${i}`, label: `V${i}` })) };
  const r = generateVariants([big, { ...big, id: "m" }], [], { defaults, limit: 100 });
  assert.equal(r.variants.length, 100);
  assert.equal(r.truncated, true);
  assert.equal(optionCombinations([big, { ...big, id: "m" }]).length, 144);
});

test("defaults flow to new variants only", () => {
  const r = generateVariants([size], [], { defaults: { price: 500, compareAt: 700, stock: 4, weightGrams: 250 } });
  assert.deepEqual(r.variants[0], { id: "v-m", options: { size: "m" }, price: 500, compareAt: 700, stock: 4, weightGrams: 250 });
  assert.equal(variantLabel([colour, size], { options: { colour: "red", size: "l" } }), "Red / L");
});

test("bulk fill touches only the chosen variants", () => {
  const vs = generateVariants([colour, size], [], { defaults: { price: 1000, stock: 5, compareAt: 1200 } }).variants;
  const ids = [vs[0].id, vs[2].id];
  const filled = bulkFillVariants(vs, ids, { price: 1250.4, compareAt: null, stockDelta: -9, skuPrefix: "BULK" });
  assert.equal(filled[0].price, 1250);
  assert.equal("compareAt" in filled[0], false);
  assert.equal(filled[0].stock, 0);
  assert.equal(filled[0].sku, "BULK-1");
  assert.equal(filled[2].sku, "BULK-2");
  assert.equal(filled[1], vs[1]);
  const untracked = bulkFillVariants([{ id: "u", options: {}, price: 1 }], ["u"], { stockDelta: 5 });
  assert.equal(untracked[0].stock, undefined);
  assert.equal(bulkFillVariants(vs, ids, { stock: null })[0].stock, undefined);
});

test("duplicate SKUs are case-insensitive and blanks are ignored", () => {
  assert.deepEqual(duplicateSkus([{ sku: "a-1" }, { sku: "A-1" }, { sku: "" }, { sku: " " }, {}, { sku: "B" }]), ["A-1"]);
});

test("margin from cost in basis points, integer rounding", () => {
  assert.deepEqual(marginFromCost(1000, 600), { profit: 400, marginBps: 4000, markupBps: 6667 });
  assert.equal(marginFromCost(1000, 0).markupBps, null);
  assert.equal(marginFromCost(0, 100), null);
  assert.equal(marginFromCost(500, null), null);
  assert.equal(marginFromCost(300, 400).marginBps, -3333);
  assert.equal(priceForMargin(600, 4000), 1000);
  assert.equal(priceForMargin(100, 10000), null);
  assert.equal(priceForMargin(333, 5000), 666);
});

test("stock summary levels", () => {
  assert.equal(stockSummary([]).level, "untracked");
  assert.deepEqual(stockSummary([{ id: "a", options: {}, price: 1, stock: 0 }, { id: "b", options: {}, price: 1, stock: 3 }]), { total: 3, level: "low", outVariants: 1 });
  assert.equal(stockSummary([{ id: "a", options: {}, price: 1, stock: 0 }]).level, "out");
  assert.equal(stockSummary([{ id: "a", options: {}, price: 1, stock: 0, allowBackorder: true }]).outVariants, 0);
  assert.equal(stockSummary([{ id: "a", options: {}, price: 1, stock: 0 }, { id: "b", options: {}, price: 1 }]).level, "untracked");
  assert.equal(stockSummary([{ id: "a", options: {}, price: 1, stock: 50 }]).level, "in");
});

const product = (id, extra = {}) => ({ id, name: id, images: [], options: [], variants: [{ id: `${id}-v`, options: {}, price: 1000, stock: 10 }], status: "active", ...extra });

test("bulk price rules round half up and never go negative", () => {
  assert.equal(bulkPrice(1005, { mode: "increase-percent", value: 1000 }), 1106);
  assert.equal(bulkPrice(1005, { mode: "decrease-percent", value: 1000 }), 904);
  assert.equal(bulkPrice(100, { mode: "decrease-amount", value: 500 }), 0);
  assert.equal(bulkPrice(100, { mode: "increase-amount", value: 50 }), 150);
  assert.equal(bulkPrice(100, { mode: "set", value: 999 }), 999);
});

test("bulk edit products: price, stock and status only on the chosen ones", () => {
  const list = [product("a", { variants: [{ id: "a1", options: {}, price: 1000, compareAt: 1200, stock: 4 }, { id: "a2", options: {}, price: 2000 }] }), product("b")];
  const out = bulkEditProducts(list, ["a"], { price: { mode: "decrease-percent", value: 5000, compareAt: true }, stock: { mode: "remove", value: 10 }, status: "draft" });
  assert.equal(out[0].variants[0].price, 500);
  assert.equal(out[0].variants[0].compareAt, 600);
  assert.equal(out[0].variants[0].stock, 0);
  assert.equal(out[0].variants[1].stock, undefined);
  assert.equal(out[0].status, "draft");
  assert.equal(out[1], list[1]);
  assert.equal(bulkEditProducts(list, ["a"], { stock: { mode: "set", value: 9 } })[0].variants[1].stock, 9);
  const cheap = bulkEditProducts([product("c", { variants: [{ id: "c1", options: {}, price: 1000, compareAt: 1100 }] })], ["c"], { price: { mode: "decrease-percent", value: 9000, compareAt: true } });
  assert.ok(cheap[0].variants[0].compareAt > cheap[0].variants[0].price);
});

const cond = (field, op, value, id = `${field}${op}${value}`) => ({ kind: "condition", id, field, op, value });
const group = (join, ...children) => ({ kind: "group", id: "g", join, children });

const catalog = [
  product("tee", { tags: ["summer", "Cotton"], brand: "Nile", category: "Clothing", variants: [{ id: "t1", options: {}, price: 34900, compareAt: 44900, stock: 3 }, { id: "t2", options: {}, price: 39900, stock: 0 }] }),
  product("mug", { tags: ["home"], brand: "Clay", category: "Home", variants: [{ id: "m1", options: {}, price: 19900 }] }),
  product("watch", { tags: ["summer"], brand: "Delta", variants: [{ id: "w1", options: {}, price: 249900, stock: 12 }] }),
  product("old", { tags: ["summer"], status: "draft" }),
];

test("collection rules: tag, price in major units, brand, stock and nesting", () => {
  const ids = (rules) => matchCollection(catalog, { kind: "rules", conditions: rules }).map((p) => p.id);
  assert.deepEqual(ids(group("and", cond("tag", "is", "SUMMER"))), ["tee", "watch"]);
  assert.deepEqual(ids(group("and", cond("tag", "is", "summer"), cond("price", "lt", "400"))), ["tee"]);
  assert.deepEqual(ids(group("and", cond("price", "lte", "199"))), ["mug"]);
  assert.deepEqual(ids(group("or", cond("brand", "is", "Clay"), cond("brand", "is", "Delta"))), ["mug", "watch"]);
  assert.deepEqual(ids(group("and", cond("stock", "gt", "5"))), ["watch"]);
  assert.deepEqual(ids(group("and", cond("onSale", "is", "true"))), ["tee"]);
  assert.deepEqual(ids(group("and", cond("tag", "contains", "cot"))), ["tee"]);
  assert.deepEqual(ids(group("and", cond("tag", "isNot", "summer"))), ["mug"]);
  assert.deepEqual(ids(group("and", cond("category", "isEmpty", ""))), ["watch"]);
  assert.deepEqual(ids(group("and", group("or", cond("brand", "is", "Nile"), cond("brand", "is", "Clay")), cond("price", "gte", "199"))), ["tee", "mug"]);
});

test("collection rules: empty rule matches nothing, drafts are hidden unless asked", () => {
  assert.deepEqual(matchCollection(catalog, { kind: "rules", conditions: group("and") }), []);
  assert.deepEqual(matchCollection(catalog, { kind: "rules" }), []);
  const r = group("and", cond("tag", "is", "summer"));
  assert.equal(matchCollection(catalog, { kind: "rules", conditions: r }, { includeInactive: true }).length, 3);
  assert.deepEqual(matchCollection(catalog, { kind: "rules", conditions: group("and", cond("status", "is", "draft")) }), []);
});

test("collection rules: untracked stock has no value; price with decimals and comma", () => {
  const stock = (rule) => matchCollection(catalog, { kind: "rules", conditions: group("and", rule) }).map((p) => p.id);
  assert.deepEqual(stock(cond("stock", "isEmpty", "")), ["mug"]);
  assert.deepEqual(stock(cond("stock", "gte", "0")).includes("mug"), false);
  assert.deepEqual(stock(cond("price", "is", "199,00")), ["mug"]);
  assert.deepEqual(stock(cond("price", "gt", "abc")), []);
});

test("manual collections keep order and skip missing or inactive products", () => {
  const c = { kind: "manual", productIds: ["watch", "gone", "old", "tee"] };
  assert.deepEqual(matchCollection(catalog, c).map((p) => p.id), ["watch", "tee"]);
  assert.deepEqual(matchCollection(catalog, c, { includeInactive: true }).map((p) => p.id), ["watch", "old", "tee"]);
  const cols = [{ id: "s", title: "Summer", kind: "rules", conditions: group("and", cond("tag", "is", "summer")) }, { id: "m", title: "M", ...c }];
  assert.deepEqual(collectionsOfProduct(catalog, cols, "tee"), ["s", "m"]);
  assert.deepEqual(collectionsOfProduct(catalog, cols, "mug"), []);
});

test("decimalToMinor uses integer maths", () => {
  assert.equal(decimalToMinor("12.5", 100), 1250);
  assert.equal(decimalToMinor("0.29", 100), 29);
  assert.equal(decimalToMinor("1.005", 100), 101);
  assert.equal(decimalToMinor("7", 1000), 7000);
  assert.equal(decimalToMinor("7", 1), 7);
  assert.equal(decimalToMinor("-3.1", 100), -310);
  assert.equal(decimalToMinor("x", 100), null);
});

test("misc helpers: slugify, moveItem", () => {
  assert.equal(slugify("  Everyday Cotton Tee! "), "everyday-cotton-tee");
  assert.equal(slugify("تيشيرت قطني"), "تيشيرت-قطني");
  assert.deepEqual(moveItem([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(moveItem([1, 2, 3], 2, -5), [3, 1, 2]);
  assert.deepEqual(moveItem([1, 2, 3], 9, 0), [1, 2, 3]);
});

test("draft validation", () => {
  const base = { title: "T", price: 1000, options: [], variants: [] };
  assert.deepEqual(validateProductDraft(base), []);
  assert.deepEqual(validateProductDraft({ ...base, title: " ", price: null }).map((i) => i.code), ["title", "price"]);
  assert.deepEqual(validateProductDraft({ ...base, compareAt: 900 }).map((i) => i.code), ["compare-at"]);
  const vs = [{ id: "a", options: { c: "x" }, price: 100, sku: "S" }, { id: "b", options: { c: "y" }, price: 100, compareAt: 50, sku: "s" }];
  const issues = validateProductDraft({ ...base, options: [{ id: "c", name: "C", values: [] }], variants: vs });
  assert.deepEqual(issues.map((i) => `${i.code}:${i.variantId ?? ""}`), ["compare-at:b", "sku-duplicate:a", "sku-duplicate:b"]);
  assert.equal(validateProductDraft({ ...base, options: [colour], variants: [] })[0].code, "no-variants");
  assert.equal(validateProductDraft({ ...base, slug: "Bad Slug" })[0].code, "slug");
});

test("drafts: a new draft is an inactive product with one default variant", () => {
  const d = emptyProductDraft();
  assert.equal(d.status, "draft");
  assert.equal(d.variants.length, 1);
  assert.equal(d.variants[0].price, 0);
  assert.equal(d.cost, null);
});

test("drafts: product to draft and back keeps the product, without sharing references", () => {
  const product = {
    id: "p1",
    name: "Tee",
    slug: "tee",
    brand: "Nasaq",
    tags: ["cotton"],
    images: [{ src: "/a.svg", alt: "A" }],
    options: [{ id: "size", name: "Size", values: [{ id: "s", label: "S" }] }],
    variants: [{ id: "v1", options: { size: "s" }, price: 1000, stock: 3 }],
    status: "active",
  };
  const d = productToDraft(product, { cost: 400, visibility: "hidden" });
  assert.equal(d.cost, 400);
  assert.equal(d.visibility, "hidden");
  assert.equal(draftChanged(d, productToDraft(product, { cost: 400, visibility: "hidden" })), false);
  d.variants[0].price = 1200;
  assert.equal(product.variants[0].price, 1000);
  assert.deepEqual(draftToProduct(productToDraft(product)), product);
});

test("drafts: draftChanged ignores key order but sees a real edit", () => {
  const a = emptyProductDraft();
  const b = { ...emptyProductDraft(), variants: [{ price: 0, options: {}, id: "default" }] };
  assert.equal(draftChanged(a, b), false);
  assert.equal(draftChanged(a, { ...a, title: "x" }), true);
  assert.equal(draftToProduct({ ...a, title: " Hat ", brand: " " }).brand, undefined);
});
