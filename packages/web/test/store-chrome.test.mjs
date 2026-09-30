import assert from "node:assert/strict";
import { test } from "node:test";
import "./_ts-resolve.mjs";
const m = await import("../src/components/store-chrome/store-chrome-model.ts");

const p = (id, name, extra = {}) => ({ id, name, images: [], options: [], variants: [], ...extra });
const products = [p("a", "Cotton tee", { brand: "Nile" }), p("b", "Cotton hoodie"), p("c", "Clay mug", { category: "Home" }), p("d", "Cotton draft", { status: "draft" }), p("e", "قميص قطني")];
const tree = [{ id: "clothing", label: "Clothing", children: [{ id: "tops", label: "Tops" }] }, { id: "home", label: "Home" }];

test("flattens the category tree with paths", () => {
  const flat = m.chromeFlattenCategories(tree);
  assert.deepEqual(flat.map((c) => c.id), ["clothing", "tops", "home"]);
  assert.equal(flat[1].path, "Clothing / Tops");
});

test("empty query lists recent then popular without repeats", () => {
  const s = m.chromeSuggest(products, "  ", { recent: ["tee", "mug"], popular: ["mug", "hoodie"] });
  assert.deepEqual(s.map((x) => `${x.kind}:${x.label}`), ["recent:tee", "recent:mug", "popular:hoodie"]);
});

test("query suggests categories, then ranked products, skipping drafts", () => {
  const s = m.chromeSuggest(products, "cotton", { categories: m.chromeFlattenCategories(tree) });
  assert.deepEqual(s.map((x) => x.id), ["product:b", "product:a"]);
  const c = m.chromeSuggest(products, "top", { categories: m.chromeFlattenCategories(tree) });
  assert.equal(c[0].kind, "category");
  assert.equal(c[0].categoryId, "tops");
});

test("Arabic queries match Arabic products", () => {
  assert.deepEqual(m.chromeSuggest(products, "قطنى").map((x) => x.id), ["product:e"]);
});

test("recent searches that continue the query are appended", () => {
  const s = m.chromeSuggest(products, "clay", { recent: ["clay bowl", "tee"] });
  assert.deepEqual(s.map((x) => x.kind), ["product", "recent"]);
});

test("limits are honoured", () => {
  const many = Array.from({ length: 12 }, (_, i) => p(`p${i}`, `Shirt ${i}`));
  assert.equal(m.chromeSuggest(many, "shirt", { maxProducts: 3 }).length, 3);
});

test("keyboard movement wraps and jumps", () => {
  assert.equal(m.chromeMoveActive(-1, 3, "ArrowDown"), 0);
  assert.equal(m.chromeMoveActive(2, 3, "ArrowDown"), 0);
  assert.equal(m.chromeMoveActive(-1, 3, "ArrowUp"), 2);
  assert.equal(m.chromeMoveActive(0, 3, "ArrowUp"), 2);
  assert.equal(m.chromeMoveActive(1, 3, "End"), 2);
  assert.equal(m.chromeMoveActive(1, 3, "Home"), 0);
  assert.equal(m.chromeMoveActive(1, 3, "a"), 1);
  assert.equal(m.chromeMoveActive(1, 0, "ArrowDown"), -1);
});

test("highlight marks matched words and keeps the original text", () => {
  const segs = m.chromeHighlight("Cotton tee", "cot tee");
  assert.equal(segs.map((s) => s.text).join(""), "Cotton tee");
  assert.deepEqual(segs.filter((s) => s.match).map((s) => s.text), ["Cot", "tee"]);
  assert.deepEqual(m.chromeHighlight("Mug", ""), [{ text: "Mug", match: false }]);
  assert.equal(m.chromeHighlight("Café au lait", "cafe")[0].text, "Café");
});

test("recent searches dedupe, move to front and cap", () => {
  assert.deepEqual(m.chromeRecordRecent(["b", "a"], "A"), ["A", "b"]);
  assert.deepEqual(m.chromeRecordRecent(["b", "a"], "  "), ["b", "a"]);
  assert.equal(m.chromeRecordRecent(["1", "2", "3"], "4", 3).length, 3);
});

test("announcements respect windows and dismissals", () => {
  const items = [{ id: "a" }, { id: "b", from: 100 }, { id: "c", until: 50 }, { id: "d" }];
  assert.deepEqual(m.chromeLiveAnnouncements(items, ["d"], 60).map((x) => x.id), ["a"]);
  assert.deepEqual(m.chromeLiveAnnouncements(items, [], 120).map((x) => x.id), ["a", "b", "d"]);
});

test("step wraps both ways", () => {
  assert.equal(m.chromeStep(2, 3, 1), 0);
  assert.equal(m.chromeStep(0, 3, -1), 2);
  assert.equal(m.chromeStep(0, 0, 1), 0);
});
