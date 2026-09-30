import assert from "node:assert/strict";
import { test } from "node:test";
import { countSteps, flattenSteps, maskSecrets, newStep, placeholders, resolvePlaceholders, stepSummary, updateStep, validateSteps } from "../src/components/step-editor/step-model.ts";

const types = [
  { id: "http", label: "HTTP", category: "a", fields: [{ name: "url", label: "URL", kind: "url", required: true }, { name: "on", label: "On", kind: "boolean", required: true }], defaults: { on: true } },
  { id: "loop", label: "Loop", category: "a" },
];

test("placeholders are found once and resolved", () => {
  assert.deepEqual(placeholders("{{a}} and {{ b }} and {{a}}"), ["a", "b"]);
  assert.deepEqual(placeholders("no {{ }} or {single}"), []);
  const params = [{ id: "1", name: "host", value: "x.io" }];
  assert.equal(resolvePlaceholders("https://{{host}}/{{other}}", params), "https://x.io/{{other}}");
});

test("secrets are masked", () => {
  const params = [{ id: "1", name: "k", value: "s3cr3t-key", secret: true }, { id: "2", name: "h", value: "public", secret: false }];
  assert.equal(maskSecrets("token s3cr3t-key public", params), "token •••••• public");
});

test("the tree is walked, counted and updated", () => {
  const tree = [{ id: "a", type: "loop", config: {}, children: [{ id: "b", type: "http", config: {} }] }, { id: "c", type: "http", config: {} }];
  assert.deepEqual(flattenSteps(tree).map((s) => s.id), ["a", "b", "c"]);
  assert.equal(countSteps(tree), 3);
  const next = updateStep(tree, "b", (s) => ({ ...s, config: { url: "x" } }));
  assert.equal(next[0].children[0].config.url, "x");
  assert.equal(tree[0].children[0].config.url, undefined);
});

test("validation finds missing fields, unknown placeholders, empty type and bad params", () => {
  const steps = [
    { id: "a", type: "http", config: { url: "https://{{host}}/{{nope}}", on: true } },
    { id: "b", type: "http", config: { on: false } },
    { id: "c", type: "", config: {} },
  ];
  const params = [{ id: "p1", name: "host", value: "x" }, { id: "p2", name: "host", value: "y" }, { id: "p3", name: "1bad", value: "" }];
  const codes = validateSteps(steps, params, types, ["trigger.body"]).map((i) => `${i.code}:${i.id}`);
  assert.deepEqual(codes.sort(), ["bad-param-name:p3", "duplicate-param:p2", "missing-field:b", "no-type:c", "unknown-placeholder:a"].sort());
  // a boolean that is false is not "missing"
  assert.equal(validateSteps([{ id: "z", type: "http", config: { url: "x", on: false } }], [], types).length, 0);
  // known variables are allowed
  assert.equal(validateSteps([{ id: "z", type: "http", config: { url: "{{trigger.body}}", on: true } }], [], types, ["trigger.body"]).length, 0);
});

test("new steps carry defaults and summaries use the first filled text", () => {
  const s = newStep(types[0]);
  assert.equal(s.config.on, true);
  assert.equal(s.type, "http");
  assert.equal(newStep().type, "");
  assert.equal(stepSummary({ ...s, config: { url: "  https://a.b \n c" } }, types[0]), "https://a.b c");
});
