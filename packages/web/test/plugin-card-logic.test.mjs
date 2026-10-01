import assert from "node:assert/strict";
import { test } from "node:test";
import { humanizeKind, pluginActivity, selectionState, toggleSelected } from "../src/components/plugin-card/plugin-card-logic.ts";

const now = Date.parse("2026-10-01T12:00:00Z");

test("activity buckets: within the hour, the day, longer, never", () => {
  assert.equal(pluginActivity(now - 5 * 60_000, now), "live");
  assert.equal(pluginActivity(new Date(now - 60 * 60_000), now), "live");
  assert.equal(pluginActivity("2026-10-01T02:00:00Z", now), "recent");
  assert.equal(pluginActivity(now - 3 * 86_400_000, now), "idle");
  assert.equal(pluginActivity(null, now), "never");
  assert.equal(pluginActivity("", now), "never");
  assert.equal(pluginActivity("not a date", now), "never");
  assert.equal(pluginActivity(now + 60_000, now), "live");
  assert.equal(pluginActivity(now - 3 * 3_600_000, now, { recentHours: 2 }), "idle");
});

test("unknown kinds are spelled out", () => {
  assert.equal(humanizeKind("ai_provider"), "Ai provider");
  assert.equal(humanizeKind("mcp-server"), "Mcp server");
  assert.equal(humanizeKind("__"), "");
});

test("selection keeps order and reports all / some / none", () => {
  assert.deepEqual(toggleSelected(["b"], "a", true), ["b", "a"]);
  assert.deepEqual(toggleSelected(["b", "a"], "b", false), ["a"]);
  assert.deepEqual(toggleSelected(["a"], "a", true), ["a"]);
  assert.equal(selectionState([], ["a", "b"]), "none");
  assert.equal(selectionState(["a"], ["a", "b"]), "some");
  assert.equal(selectionState(["b", "a", "z"], ["a", "b"]), "all");
  assert.equal(selectionState(["a"], []), "none");
});
