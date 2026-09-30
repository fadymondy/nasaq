import assert from "node:assert/strict";
import { test } from "node:test";
import "./_ts-resolve.mjs";
const m = await import("../src/components/store-listing/listing-model.ts");

const colour = { id: "colour", name: "Colour", display: "swatch", values: [{ id: "red", label: "Red" }, { id: "blue", label: "Blue" }] };
const size = { id: "size", name: "Size", display: "button", values: [{ id: "m", label: "M" }, { id: "l", label: "L" }] };
const v = (id, o, price, extra = {}) => ({ id, options: o, price, ...extra });

const products = [
  { id: "tee", name: "Cotton tee", brand: "Nile", category: "Tops", options: [colour, size], rating: { average: 4.6, count: 200 }, description: "Soft everyday shirt", variants: [
    v("t1", { colour: "red", size: "m" }, 1000, { compareAt: 1500, stock: 0 }),
    v("t2", { colour: "red", size: "l" }, 1000, { compareAt: 1500, stock: 4 }),
    v("t3", { colour: "blue", size: "m" }, 1200, { stock: 0 }),
  ] },
  { id: "hood", name: "Fleece hoodie", brand: "Nile", category: "Jackets", options: [colour], rating: { average: 3.2, count: 20 }, variants: [v("h1", { colour: "blue" }, 5000), v("h2", { colour: "red" }, 5200, { stock: 0 })] },
  { id: "mug", name: "Clay mug", brand: "Fayoum", category: "Home", options: [], rating: { average: 4.9, count: 400 }, variants: [v("m1", {}, 800)] },
  { id: "bare", name: "Gift card", category: "Home", options: [], variants: [] },
];
const tree = [
  { id: "Clothing", label: "Clothing", children: [{ id: "Tops", label: "Tops" }, { id: "Jackets", label: "Jackets" }] },
  { id: "Home", label: "Home" },
];
const F = m.EMPTY_LISTING_FILTERS;
const ids = (list) => list.map((p) => p.id);

test("normalize folds Arabic and Latin variants", () => {
  assert.equal(m.listingNormalize("  إِسْلَام  "), m.listingNormalize("اسلام"));
  assert.equal(m.listingNormalize("Café"), "cafe");
  assert.equal(m.listingNormalize("مدرسة"), m.listingNormalize("مدرسه"));
});

test("search needs every token and ranks name matches first", () => {
  assert.equal(m.listingSearchScore(products[0], "cotton zzz"), 0);
  assert.ok(m.listingSearchScore(products[0], "cotton") > m.listingSearchScore(products[0], "shirt"));
  assert.deepEqual(ids(m.listingFilter(products, { ...F, query: "nile" })), ["tee", "hood"]);
  assert.deepEqual(ids(m.listingSort(products, "relevance", "shirt")), ["tee", "hood", "mug", "bare"]);
});

test("category filter includes descendants", () => {
  assert.deepEqual(ids(m.listingFilter(products, { ...F, category: "Clothing" }, { tree })), ["tee", "hood"]);
  assert.deepEqual(ids(m.listingFilter(products, { ...F, category: "Tops" }, { tree })), ["tee"]);
  assert.deepEqual(ids(m.listingFilter(products, { ...F, category: "Home" })), ["mug", "bare"]);
  assert.deepEqual([...m.listingDescendantIds(tree, "Clothing")].sort(), ["Clothing", "Jackets", "Tops"]);
  assert.deepEqual(m.listingCategoryPath(tree, "Jackets"), ["Clothing", "Jackets"]);
});

test("option filters match on the same variant", () => {
  // red + M exists only out of stock
  const both = { ...F, options: { colour: ["red"], size: ["m"] } };
  assert.deepEqual(ids(m.listingFilter(products, both)), ["tee"]);
  assert.deepEqual(ids(m.listingFilter(products, { ...both, inStock: true })), []);
  // blue + L does not exist on the tee
  assert.deepEqual(ids(m.listingFilter(products, { ...F, options: { colour: ["blue"], size: ["l"] } })), []);
  // OR within one option
  assert.deepEqual(ids(m.listingFilter(products, { ...F, options: { colour: ["red", "blue"] } })), ["tee", "hood"]);
});

test("price, rating, stock and sale filters", () => {
  assert.deepEqual(ids(m.listingFilter(products, { ...F, price: [900, 1100] })), ["tee"]);
  assert.deepEqual(ids(m.listingFilter(products, { ...F, minRating: 4 })), ["tee", "mug"]);
  assert.deepEqual(ids(m.listingFilter(products, { ...F, onSale: true })), ["tee"]);
  assert.deepEqual(ids(m.listingFilter(products, { ...F, inStock: true })), ["tee", "hood", "mug"]);
  // a product with no variants only survives when nothing variant-level is filtered
  assert.deepEqual(ids(m.listingFilter(products, { ...F, brands: [] })).includes("bare"), true);
  assert.deepEqual(ids(m.listingFilter(products, { ...F, onSale: true })).includes("bare"), false);
});

test("sorting is stable and handles every mode", () => {
  assert.deepEqual(ids(m.listingSort(products, "price-asc")), ["bare", "mug", "tee", "hood"]);
  assert.deepEqual(ids(m.listingSort(products, "price-desc")), ["hood", "tee", "mug", "bare"]);
  assert.deepEqual(ids(m.listingSort(products, "rating")), ["mug", "tee", "hood", "bare"]);
  assert.deepEqual(ids(m.listingSort(products, "popular")), ["mug", "tee", "hood", "bare"]);
  assert.deepEqual(ids(m.listingSort(products, "discount"))[0], "tee");
  assert.deepEqual(ids(m.listingSort(products, "name")), ["mug", "tee", "bare", "hood"].sort((a, b) => products.find((p) => p.id === a).name.localeCompare(products.find((p) => p.id === b).name)));
  assert.deepEqual(ids(m.listingSort(products, "relevance")), ids(products));
  // does not mutate the input
  assert.deepEqual(ids(products), ["tee", "hood", "mug", "bare"]);
});

test("facet counts are disjunctive", () => {
  const f = { ...F, options: { colour: ["red"] }, brands: ["Nile"] };
  const facets = m.listingFacets(products, f, tree);
  const colourFacet = facets.options.find((o) => o.id === "colour");
  // With brand Nile applied, colour counts ignore the colour selection itself.
  assert.equal(colourFacet.values.find((x) => x.id === "red").count, 2);
  assert.equal(colourFacet.values.find((x) => x.id === "blue").count, 2);
  assert.equal(colourFacet.values.find((x) => x.id === "red").selected, true);
  // Brand counts keep the colour filter: Fayoum has no red variants.
  assert.equal(facets.brands.find((b) => b.id === "Fayoum").count, 0);
  assert.equal(facets.brands.find((b) => b.id === "Nile").count, 2);
  // Size counts respect the colour selection: red+M and red+L both exist on the tee.
  const sizeFacet = facets.options.find((o) => o.id === "size");
  assert.equal(sizeFacet.values.find((x) => x.id === "l").count, 1);
});

test("category tree counts roll up and mark the open branch", () => {
  const facets = m.listingFacets(products, { ...F, category: "Tops" }, tree);
  const clothing = facets.categories.find((c) => c.id === "Clothing");
  assert.equal(clothing.count, 2);
  assert.equal(clothing.open, true);
  assert.equal(clothing.selected, false);
  assert.equal(clothing.children.find((c) => c.id === "Tops").selected, true);
  assert.equal(clothing.children.find((c) => c.id === "Jackets").count, 1);
  assert.equal(facets.categories.find((c) => c.id === "Home").count, 2);
});

test("rating, stock and sale facets and price bounds", () => {
  const facets = m.listingFacets(products, F, tree);
  assert.deepEqual(facets.ratings.map((r) => [r.min, r.count]), [[4, 2], [3, 3], [2, 3], [1, 3]]);
  assert.equal(facets.inStock, 3);
  assert.equal(facets.onSale, 1);
  assert.deepEqual(facets.price, { min: 800, max: 5200 });
  // price bounds stay put while filtering
  assert.deepEqual(m.listingFacets(products, { ...F, brands: ["Fayoum"] }, tree).price, { min: 800, max: 5200 });
});

test("chips: order, removal and clear all", () => {
  const f = { ...F, query: "tee", category: "Tops", brands: ["Nile"], options: { colour: ["red", "blue"] }, price: [500, 2000], minRating: 4, inStock: true, onSale: true };
  const chips = m.listingActiveChips(f);
  assert.deepEqual(chips.map((c) => c.kind), ["query", "category", "brand", "option", "option", "price", "rating", "stock", "sale"]);
  assert.equal(m.listingFilterCount(f), 8);
  const noRed = m.listingRemoveChip(f, chips.find((c) => c.kind === "option" && c.value === "red"));
  assert.deepEqual(noRed.options, { colour: ["blue"] });
  const noBlue = m.listingRemoveChip(noRed, chips.find((c) => c.kind === "option" && c.value === "blue"));
  assert.deepEqual(noBlue.options, {});
  assert.equal(m.listingRemoveChip(f, chips[0]).query, "");
  assert.equal(m.listingRemoveChip(f, chips.find((c) => c.kind === "price")).price, null);
  assert.deepEqual(m.listingActiveChips(m.listingClear(f)).map((c) => c.kind), ["query"]);
  assert.deepEqual(m.listingActiveChips(m.listingClear(f, false)), []);
});

test("toggle helpers and equality", () => {
  const a = m.listingToggleOption(F, "colour", "red");
  assert.deepEqual(a.options, { colour: ["red"] });
  assert.deepEqual(m.listingToggleOption(a, "colour", "red").options, {});
  assert.equal(m.listingFiltersEqual({ ...F, brands: ["a", "b"] }, { ...F, brands: ["b", "a"] }), true);
  assert.equal(m.listingFiltersEqual({ ...F, options: { c: [] } }, F), true);
  assert.equal(m.listingFiltersEqual({ ...F, onSale: true }, F), false);
});

test("relaxations suggest the filters that bring results back", () => {
  const f = { ...F, brands: ["Fayoum"], options: { colour: ["red"] } };
  assert.deepEqual(ids(m.listingFilter(products, f)), []);
  const relax = m.listingRelaxations(products, f, tree);
  assert.deepEqual(relax.map((r) => [r.chip.kind, r.count]), [["brand", 2], ["option", 1]]);
});

test("paging maths", () => {
  assert.deepEqual(m.listingPage(25, 2, 10), { page: 2, pageCount: 3, total: 25, from: 11, to: 20, start: 10, end: 20 });
  assert.equal(m.listingPage(25, 9, 10).page, 3);
  assert.equal(m.listingPage(25, 0, 10).page, 1);
  assert.deepEqual(m.listingPage(0, 1, 10), { page: 1, pageCount: 1, total: 0, from: 0, to: 0, start: 0, end: 0 });
  assert.equal(m.listingVisibleCount(25, 10, 0), 10);
  assert.equal(m.listingVisibleCount(25, 10, 5), 25);
});

test("compare toggling respects the cap", () => {
  assert.deepEqual(m.listingToggleCompare([], "a"), { ids: ["a"], rejected: false });
  assert.deepEqual(m.listingToggleCompare(["a", "b"], "a"), { ids: ["b"], rejected: false });
  assert.deepEqual(m.listingToggleCompare(["a", "b"], "c", 2), { ids: ["a", "b"], rejected: true });
});

test("compare rows flag differences", () => {
  const rows = m.listingCompareRows([products[0], products[2]]);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(byId.price.differs, true);
  assert.deepEqual(byId.price.cells, [1000, 800]);
  assert.equal(byId.brand.differs, true);
  assert.equal(byId["option:colour"].cells[1], null);
  assert.equal(byId.availability.differs, false);
  const same = m.listingCompareRows([products[0], products[0]]);
  assert.equal(same.every((r) => !r.differs), true);
  assert.equal(m.listingCompareDifferences(rows, 2).every((r) => r.differs), true);
  assert.equal(m.listingCompareDifferences(rows, 1).length, rows.length);
});

test("product facts", () => {
  assert.equal(m.listingMinPrice(products[0]), 1000);
  assert.equal(m.listingBestDiscount(products[0]), 33);
  assert.equal(m.listingHasPriceRange(products[0]), true);
  assert.equal(m.listingHasPriceRange(products[2]), false);
  assert.equal(m.listingCheapestVariant(products[0]).id, "t1");
  assert.equal(m.listingProductInStock(products[1]), true);
  assert.equal(m.listingToMajor(34950, 2), 349.5);
  assert.equal(m.listingToMinor(349.5, 2), 34950);
  assert.equal(m.listingToMinor(19.99, 2), 1999);
});
