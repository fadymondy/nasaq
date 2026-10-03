import assert from "node:assert/strict";
import { test } from "node:test";
import { groupDetailTabs, stepDetailTab } from "../src/components/detail-layout/detail-layout-logic.ts";

const tabs = [
  { key: "overview", section: "General" },
  { key: "activity", section: "General" },
  { key: "home" },
  { key: "settings", section: "Settings" },
  { key: "secrets", section: "Settings", disabled: true },
  { key: "logs", section: "General" },
];
const keys = (list) => list.map((t) => t.key);

test("tabs group by section in first-appearance order, unsectioned first", () => {
  const groups = groupDetailTabs(tabs);
  assert.deepEqual(groups.map((g) => g.section), [null, "General", "Settings"]);
  assert.deepEqual(keys(groups[1].tabs), ["overview", "activity", "logs"]);
  assert.deepEqual(groupDetailTabs([{ key: "a" }]).map((g) => g.section), [null]);
  assert.deepEqual(groupDetailTabs([]), []);
});

test("arrow steps skip disabled tabs and wrap", () => {
  assert.equal(stepDetailTab(tabs, "settings", 1).key, "logs");
  assert.equal(stepDetailTab(tabs, "logs", 1).key, "overview");
  assert.equal(stepDetailTab(tabs, "overview", -1).key, "logs");
  assert.equal(stepDetailTab(tabs, "home", "first").key, "overview");
  assert.equal(stepDetailTab(tabs, "home", "last").key, "logs");
  assert.equal(stepDetailTab(tabs, "missing", 1).key, "overview");
  assert.equal(stepDetailTab([{ key: "x", disabled: true }], "x", 1), undefined);
});
