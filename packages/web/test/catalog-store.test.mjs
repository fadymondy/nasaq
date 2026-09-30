import assert from "node:assert/strict";
import { test } from "node:test";
import { categoryCounts, filterCatalog, foldSearch, sortCatalog } from "../src/components/catalog-store/catalog-logic.ts";

const items = [
  { id: "a", name: "Send email", summary: "Mail someone", category: "comms", installs: 50, updatedAt: "2026-01-01" },
  { id: "b", name: "إرسال رسالة", summary: "أرسل رسالة واتساب", category: "comms", installs: 900, updatedAt: "2026-05-01" },
  { id: "c", name: "Approve", summary: "Ask a human", category: "human", tags: ["review"], installs: 300, updatedAt: "2026-03-01" },
];

test("foldSearch ignores case, hamza and diacritics", () => {
  assert.equal(foldSearch("أَرسل"), foldSearch("ارسل"));
  assert.equal(foldSearch("Café"), "cafe");
});

test("filterCatalog by query, category and installed", () => {
  assert.equal(filterCatalog(items, { query: "ارسل" }).length, 1);
  assert.equal(filterCatalog(items, { query: "review" })[0].id, "c");
  assert.equal(filterCatalog(items, { category: "comms" }).length, 2);
  assert.equal(filterCatalog(items, { installedOnly: true }, (i) => i.id === "c").length, 1);
});

test("sortCatalog orders and does not mutate", () => {
  assert.deepEqual(sortCatalog(items, "popular").map((i) => i.id), ["b", "c", "a"]);
  assert.deepEqual(sortCatalog(items, "newest").map((i) => i.id), ["b", "c", "a"]);
  assert.equal(sortCatalog(items, "name", "en")[0].id, "c");
  assert.equal(items[0].id, "a");
});

test("categoryCounts counts after the search", () => {
  const c = categoryCounts(items, "");
  assert.equal(c.get("all"), 3);
  assert.equal(c.get("comms"), 2);
  assert.equal(categoryCounts(items, "email").get("comms"), 1);
});
