import assert from "node:assert/strict";
import test from "node:test";
import { changedKeys, effectiveLimit, hasErrors, parseNumberInput, ruleEquals, ruleOf, validateRules } from "../src/components/limits-editor/limits-math.ts";

test("ruleOf defaults to inherit", () => {
  assert.deepEqual(ruleOf({}, "seats"), { mode: "inherit" });
});

test("validateRules requires a value for limit mode and rejects negatives", () => {
  const errors = validateRules(
    { a: { mode: "limit" }, b: { mode: "limit", value: -1 }, c: { mode: "unlimited", price: -2 }, d: { mode: "limit", value: 5 } },
    ["a", "b", "c", "d"],
  );
  assert.equal(errors.a.value, "required");
  assert.equal(errors.b.value, "invalid");
  assert.equal(errors.c.price, "invalid");
  assert.equal(errors.d, undefined);
  assert.equal(hasErrors(errors), true);
  assert.equal(hasErrors({}), false);
});

test("validateRules ignores fields that are not shown", () => {
  const errors = validateRules({ a: { mode: "limit", value: 1, price: -1 } }, ["a"], ["value"]);
  assert.equal(hasErrors(errors), false);
});

test("effectiveLimit", () => {
  assert.equal(effectiveLimit({ mode: "unlimited" }, 5), null);
  assert.equal(effectiveLimit({ mode: "limit", value: 9 }, 5), 9);
  assert.equal(effectiveLimit({ mode: "inherit" }, 5), 5);
  assert.equal(effectiveLimit({ mode: "inherit" }, undefined), undefined);
});

test("ruleEquals ignores a stale value outside limit mode; changedKeys follows key order", () => {
  assert.equal(ruleEquals({ mode: "unlimited", value: 3 }, { mode: "unlimited" }), true);
  assert.equal(ruleEquals({ mode: "limit", value: 3 }, { mode: "limit", value: 4 }), false);
  assert.deepEqual(
    changedKeys({ a: { mode: "limit", value: 1 } }, { a: { mode: "limit", value: 2 }, b: { mode: "unlimited" } }, ["b", "a", "c"]),
    ["b", "a"],
  );
});

test("parseNumberInput", () => {
  assert.equal(parseNumberInput("  "), undefined);
  assert.equal(parseNumberInput("12.5"), 12.5);
  assert.ok(Number.isNaN(parseNumberInput("abc")));
});
