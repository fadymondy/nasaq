import assert from "node:assert/strict";
import test from "node:test";
import { resolveEffort, selectionReady } from "../src/components/ai-model-picker/model-picker-math.ts";

test("resolveEffort keeps a supported effort, else medium, else first, else undefined", () => {
  const m = { efforts: ["low", "medium", "high"] };
  assert.equal(resolveEffort(m, "high"), "high");
  assert.equal(resolveEffort(m, "max"), "medium");
  assert.equal(resolveEffort({ efforts: ["low", "high"] }, "max"), "low");
  assert.equal(resolveEffort({}, "high"), undefined);
  assert.equal(resolveEffort(undefined, "high"), undefined);
});

test("selectionReady needs a model and, when required, an agent", () => {
  assert.equal(selectionReady({}, false), false);
  assert.equal(selectionReady({ model: "a" }, false), true);
  assert.equal(selectionReady({ model: "a" }, true), false);
  assert.equal(selectionReady({ model: "a", agent: "x" }, true), true);
});
