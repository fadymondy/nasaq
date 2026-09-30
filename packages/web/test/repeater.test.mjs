import assert from "node:assert/strict";
import { test } from "node:test";
import { canAdd, canRemove, fitKeys, insertAt, keyTarget, moveItem, removeAt } from "../src/components/repeater/repeater-math.ts";
import { SCHEMA_MESSAGES, countIssues, defaultRow, validateRow, validateRows } from "../src/components/schema-repeater/schema.ts";

test("limits", () => {
  assert.equal(canAdd(2, 3), true);
  assert.equal(canAdd(3, 3), false);
  assert.equal(canAdd(99), true);
  assert.equal(canRemove(1, 1), false);
  assert.equal(canRemove(2, 1), true);
  assert.equal(canRemove(1), true);
});

test("insert, remove and move never mutate", () => {
  const list = ["a", "b", "c"];
  assert.deepEqual(insertAt(list, 1, "x"), ["a", "x", "b", "c"]);
  assert.deepEqual(insertAt(list, 99, "x"), ["a", "b", "c", "x"]);
  assert.deepEqual(removeAt(list, 1), ["a", "c"]);
  assert.deepEqual(removeAt(list, 9), ["a", "b", "c"]);
  assert.deepEqual(moveItem(list, 0, 2), ["b", "c", "a"]);
  assert.deepEqual(moveItem(list, 2, 0), ["c", "a", "b"]);
  assert.deepEqual(moveItem(list, 1, 99), ["a", "c", "b"]);
  assert.deepEqual(list, ["a", "b", "c"]);
});

test("keyTarget maps reorder keys and clamps", () => {
  assert.equal(keyTarget("ArrowUp", 0, 3), 0);
  assert.equal(keyTarget("ArrowUp", 2, 3), 1);
  assert.equal(keyTarget("ArrowDown", 2, 3), 2);
  assert.equal(keyTarget("Home", 2, 3), 0);
  assert.equal(keyTarget("End", 0, 3), 2);
  assert.equal(keyTarget("Enter", 0, 3), null);
});

test("fitKeys keeps existing keys", () => {
  let n = 0;
  const make = () => `n${n++}`;
  assert.deepEqual(fitKeys(["a", "b"], 3, make), ["a", "b", "n0"]);
  assert.deepEqual(fitKeys(["a", "b", "c"], 2, make), ["a", "b"]);
});

const fields = [
  { key: "name", type: "text", label: "Name", required: true, minLength: 2 },
  { key: "email", type: "text", label: "Email", inputType: "email" },
  { key: "qty", type: "number", label: "Qty", min: 1, max: 10, integer: true },
  { key: "plan", type: "select", label: "Plan", options: [{ value: "a", label: "A" }] },
  { key: "on", type: "switch", label: "On" },
  { key: "due", type: "date", label: "Due", min: "2026-01-01" },
  { key: "tags", type: "repeater", label: "Tags", min: 1, fields: [{ key: "t", type: "text", label: "Tag", required: true }] },
];

test("defaultRow fills every field", () => {
  assert.deepEqual(defaultRow(fields), { name: "", email: "", qty: null, plan: null, on: false, due: null, tags: [] });
});

test("validateRow flags built-in rules", () => {
  const m = SCHEMA_MESSAGES.en;
  const errors = validateRow(fields, { name: "A", email: "nope", qty: 2.5, plan: "zzz", on: false, due: "2025-05-05", tags: [] }, m);
  assert.equal(errors.name.message, "Name needs at least 2 characters.");
  assert.equal(errors.email.message, "Email must be a valid email address.");
  assert.equal(errors.qty.message, "Qty must be a whole number.");
  assert.equal(errors.plan.message, "Choose a valid option for Plan.");
  assert.equal(errors.due.message, "Due must be on or after 2026-01-01.");
  assert.equal(errors.tags.message, "Add at least 1 in Tags.");
  assert.equal(errors.on, undefined);
});

test("required beats other rules and empty optional fields pass", () => {
  const m = SCHEMA_MESSAGES.en;
  const errors = validateRow(fields, { name: "  ", email: "", qty: null, plan: null, on: true, due: null, tags: [{ t: "x" }] }, m);
  assert.deepEqual(Object.keys(errors), ["name"]);
  assert.equal(errors.name.message, "Name is required.");
});

test("nested repeater rows are validated by index", () => {
  const m = SCHEMA_MESSAGES.en;
  const errors = validateRow(fields, { name: "Ok", tags: [{ t: "x" }, { t: "" }] }, m);
  assert.equal(errors.tags.message, undefined);
  assert.equal(errors.tags.rows.length, 2);
  assert.deepEqual(errors.tags.rows[0], {});
  assert.equal(errors.tags.rows[1].t.message, "Tag is required.");
  assert.equal(countIssues([errors]), 1);
});

test("hidden fields are skipped and custom rules run last", () => {
  const m = SCHEMA_MESSAGES.en;
  const schema = [
    { key: "a", type: "switch", label: "A" },
    { key: "b", type: "text", label: "B", required: true, hidden: (row) => !row.a },
    { key: "c", type: "text", label: "C", validate: (v) => (v === "bad" ? "C is bad." : null) },
  ];
  assert.deepEqual(validateRow(schema, { a: false, b: "", c: "" }, m), {});
  assert.equal(validateRow(schema, { a: true, b: "", c: "bad" }, m).b.message, "B is required.");
  assert.equal(validateRow(schema, { a: false, b: "", c: "bad" }, m).c.message, "C is bad.");
});

test("validateRows applies row limits and counts", () => {
  const m = SCHEMA_MESSAGES.ar;
  const schema = [{ key: "n", type: "text", label: "الاسم", required: true }];
  const result = validateRows(schema, [{ n: "" }], { min: 2, label: "الأعضاء", messages: m });
  assert.equal(result.valid, false);
  assert.equal(result.count, 2);
  assert.equal(result.message, "أضف 2 على الأقل في الأعضاء.");
  assert.equal(validateRows(schema, [{ n: "x" }], { max: 1 }).valid, true);
});
