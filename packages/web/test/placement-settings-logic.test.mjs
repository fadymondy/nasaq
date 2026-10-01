import assert from "node:assert/strict";
import { test } from "node:test";
import { canBeDefaultPage, isModeAvailable, parseOrder, placementChanges, withMode } from "../src/components/placement-settings/placement-settings-logic.ts";

test("only sidebar and header can be the start page; overlays need permission", () => {
  assert.equal(canBeDefaultPage("sidebar"), true);
  assert.equal(canBeDefaultPage("header"), true);
  assert.equal(canBeDefaultPage("fixed"), false);
  assert.equal(canBeDefaultPage("hidden"), false);
  assert.equal(isModeAvailable("sideover", false), false);
  assert.equal(isModeAvailable("fixed", true), true);
  assert.equal(isModeAvailable("hidden", false), true);
});

test("parseOrder accepts whole non-negative numbers only", () => {
  assert.equal(parseOrder("0"), 0);
  assert.equal(parseOrder(" 12 "), 12);
  assert.equal(parseOrder(""), null);
  assert.equal(parseOrder("-1"), null);
  assert.equal(parseOrder("1.5"), null);
  assert.equal(parseOrder("abc"), null);
});

test("withMode turns the start page off for modes without a page", () => {
  assert.deepEqual(withMode({ mode: "sidebar", order: 3, defaultPage: true }, "hidden"), { mode: "hidden", order: 3, defaultPage: false });
  assert.deepEqual(withMode({ mode: "sidebar", order: 3, defaultPage: true }, "header"), { mode: "header", order: 3, defaultPage: true });
});

test("placementChanges sends only what changed", () => {
  const saved = { mode: "sidebar", order: 10 };
  assert.deepEqual(placementChanges(saved, { mode: "sidebar", order: 10, defaultPage: false }), {});
  assert.deepEqual(placementChanges(saved, { mode: "header", order: 10 }), { mode: "header" });
  assert.deepEqual(placementChanges(saved, { mode: "sidebar", order: 2, defaultPage: true }), { order: 2, defaultPage: true });
  assert.deepEqual(placementChanges(saved, { mode: "sidebar", order: 10, defaultPage: true }, false), {});
});
