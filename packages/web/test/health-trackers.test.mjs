import assert from "node:assert/strict";
import { test } from "node:test";
import { cupCounts, cupState, foodDraftCompleteness, foodDraftValid, verdictCounts, verdictTone } from "../src/components/health-trackers/health-trackers-logic.ts";

test("cup states: only the first empty cup is next", () => {
  const states = Array.from({ length: 5 }, (_, i) => cupState(i, 2, 5));
  assert.deepEqual(states, ["filled", "filled", "next", "empty", "empty"]);
  assert.deepEqual(Array.from({ length: 3 }, (_, i) => cupState(i, 3, 3)), ["filled", "filled", "filled"]);
});

test("cup counts clamp bad snapshots", () => {
  assert.deepEqual(cupCounts(9, 4), { filled: 4, total: 4 });
  assert.deepEqual(cupCounts(-2, Number.NaN), { filled: 0, total: 0 });
  assert.equal(cupCounts(1, 5000).total, 60);
});

test("verdict counts and tones keep unreviewed neutral", () => {
  assert.deepEqual(verdictCounts([{ verdict: "safe" }, { verdict: "safe" }, { verdict: "trigger" }]), { safe: 2, trigger: 1, unreviewed: 0 });
  assert.equal(verdictTone("unreviewed"), "neutral");
  assert.equal(verdictTone("safe"), "success");
  assert.equal(verdictTone("trigger"), "danger");
});

test("draft completeness counts steps and needs families for triggers", () => {
  const blank = { kind: "food", name: "", verdict: "unreviewed", triggerFamilies: [] };
  assert.equal(foodDraftCompleteness(blank).done, 0);
  const trig = { kind: "drink", name: "Cola", nameAr: "كولا", verdict: "trigger", triggerFamilies: [], note: "" };
  const c = foodDraftCompleteness(trig);
  assert.deepEqual(c.missing, ["families", "note"]);
  assert.equal(c.total, 5);
  assert.equal(foodDraftCompleteness({ ...trig, verdict: "safe" }).total, 4);
  assert.equal(foodDraftValid(trig), false);
  assert.equal(foodDraftValid({ ...trig, triggerFamilies: ["acid"] }), true);
  assert.equal(foodDraftValid({ ...blank, name: "  " }), false);
});
