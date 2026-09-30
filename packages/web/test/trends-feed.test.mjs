import assert from "node:assert/strict";
import { test } from "node:test";
import { actionsFor, countByState, dayKey, groupTopicsByDay, resolveActiveTier, stateAfter } from "../src/components/trends-feed/trends-feed-math.ts";

const src = (tier, enabled = true, health = "ok") => ({ tier, enabled, health });

test("tier 1 is active while it has a usable source", () => {
  assert.deepEqual(resolveActiveTier([src(1), src(2)]), { tier: 1, fellBack: false, skipped: [] });
  assert.equal(resolveActiveTier([src(1, true, "degraded"), src(2)]).tier, 1);
});

test("falls back to the next tier when the first has none usable", () => {
  const r = resolveActiveTier([src(1, false), src(1, true, "down"), src(2), src(3)]);
  assert.deepEqual(r, { tier: 2, fellBack: true, skipped: [1] });
  assert.deepEqual(resolveActiveTier([src(1, false), src(2, true, "down"), src(3)]), { tier: 3, fellBack: true, skipped: [1, 2] });
});

test("empty tiers are not fallbacks and nothing usable gives null", () => {
  assert.deepEqual(resolveActiveTier([src(2)]), { tier: 2, fellBack: false, skipped: [] });
  assert.deepEqual(resolveActiveTier([src(1, false)]), { tier: null, fellBack: false, skipped: [1] });
  assert.equal(resolveActiveTier([]).tier, null);
});

test("actions follow the state", () => {
  assert.deepEqual(actionsFor("new"), ["save", "review", "dismiss"]);
  assert.deepEqual(actionsFor("dismissed"), ["restore"]);
  assert.equal(stateAfter("save"), "saved");
  assert.equal(stateAfter("restore"), "new");
});

test("counts per state", () => {
  assert.deepEqual(countByState([{ state: "new" }, { state: "new" }, { state: "saved" }]), { new: 2, saved: 1, reviewed: 0, dismissed: 0 });
});

test("days are read in the given zone", () => {
  assert.equal(dayKey("2026-09-29T22:30:00Z", "UTC"), "2026-09-29");
  assert.equal(dayKey("2026-09-29T22:30:00Z", "Asia/Riyadh"), "2026-09-30");
});

test("groups newest day first and highest score first", () => {
  const g = groupTopicsByDay(
    [
      { id: "a", score: 40, detectedAt: "2026-09-29T10:00:00Z" },
      { id: "b", score: 90, detectedAt: "2026-09-30T08:00:00Z" },
      { id: "c", score: 70, detectedAt: "2026-09-30T09:00:00Z" },
    ],
    "UTC",
  );
  assert.deepEqual(g.map((x) => x.day), ["2026-09-30", "2026-09-29"]);
  assert.deepEqual(g[0].topics.map((t) => t.id), ["b", "c"]);
});
