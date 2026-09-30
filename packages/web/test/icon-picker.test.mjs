import assert from "node:assert/strict";
import test from "node:test";
import { ICON_CATALOG, ICON_CATEGORIES, toKebab } from "../src/components/icon-picker/icon-catalog.ts";
import { filterIcons, nextGridIndex, normalizeIconQuery, pushRecent } from "../src/components/icon-picker/icon-search.ts";

test("toKebab converts component names", () => {
  assert.equal(toKebab("ArrowDown"), "arrow-down");
  assert.equal(toKebab("Building2"), "building-2");
  assert.equal(toKebab("House"), "house");
});

test("the catalog has unique kebab-case names and known categories", () => {
  const names = ICON_CATALOG.map((i) => i.name);
  assert.equal(new Set(names).size, names.length);
  for (const n of names) assert.match(n, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  for (const i of ICON_CATALOG) assert.ok(ICON_CATEGORIES.includes(i.category), i.name);
});

test("normalizeIconQuery folds Arabic variants and diacritics", () => {
  assert.equal(normalizeIconQuery("  Home-Page "), "home page");
  assert.equal(normalizeIconQuery("أَحمد"), normalizeIconQuery("احمد"));
});

test("filterIcons searches names, English and Arabic keywords, and categories", () => {
  assert.ok(filterIcons(ICON_CATALOG, "home").some((i) => i.name === "house"));
  assert.equal(filterIcons(ICON_CATALOG, "house")[0].name, "house");
  assert.ok(filterIcons(ICON_CATALOG, "بريد").some((i) => i.name === "mail"));
  assert.deepEqual(filterIcons(ICON_CATALOG, "zzzzqqq"), []);
  const files = filterIcons(ICON_CATALOG, "", "files");
  assert.ok(files.length > 5 && files.every((i) => i.category === "files"));
  assert.ok(filterIcons(ICON_CATALOG, "mail", "files").length === 0);
});

test("nextGridIndex moves by columns and swaps arrows in RTL", () => {
  assert.equal(nextGridIndex("ArrowRight", 3, 20, 8), 4);
  assert.equal(nextGridIndex("ArrowRight", 3, 20, 8, true), 2);
  assert.equal(nextGridIndex("ArrowLeft", 0, 20, 8), 0);
  assert.equal(nextGridIndex("ArrowDown", 3, 20, 8), 11);
  assert.equal(nextGridIndex("ArrowDown", 15, 20, 8), 15);
  assert.equal(nextGridIndex("ArrowUp", 3, 20, 8), 3);
  assert.equal(nextGridIndex("Home", 10, 20, 8), 8);
  assert.equal(nextGridIndex("End", 10, 20, 8), 15);
  assert.equal(nextGridIndex("End", 17, 20, 8), 19);
  assert.equal(nextGridIndex("x", 3, 20, 8), 3);
  assert.equal(nextGridIndex("ArrowDown", 0, 0, 8), -1);
});

test("pushRecent puts the newest first without duplicates and caps the list", () => {
  assert.deepEqual(pushRecent(["a", "b"], "c"), ["c", "a", "b"]);
  assert.deepEqual(pushRecent(["a", "b", "c"], "b"), ["b", "a", "c"]);
  assert.equal(pushRecent(["1", "2", "3"], "4", 3).length, 3);
});
