import assert from "node:assert/strict";
import { test } from "node:test";
import { addChild, countConditions, describeRule, emptyRule, evaluateConditions, groupDepth, newCondition, newGroup, removeNode, retarget, updateNode, validateRule } from "../src/components/rule-builder/rule-model.ts";

const fields = [
  { id: "amount", label: "Amount", kind: "number" },
  { id: "country", label: "Country", kind: "select", options: [{ value: "sa", label: "Saudi Arabia" }, { value: "eg", label: "Egypt" }] },
  { id: "note", label: "Note", kind: "text" },
  { id: "vip", label: "VIP", kind: "boolean" },
];
const cond = (field, op, value) => ({ ...newCondition(fields.find((f) => f.id === field)), op, value });

test("new conditions start with a fitting operator and value", () => {
  assert.equal(newCondition(fields[0]).op, "is");
  assert.equal(newCondition(fields[1]).value, "sa");
  assert.equal(newCondition(fields[3]).value, "true");
  assert.equal(newCondition(undefined).field, "");
});

test("tree edits", () => {
  let root = newGroup("and");
  const inner = newGroup("or");
  const a = cond("amount", "gt", "100");
  root = addChild(root, root.id, inner);
  root = addChild(root, inner.id, a);
  assert.equal(countConditions(root), 1);
  assert.equal(groupDepth(root), 2);
  root = updateNode(root, a.id, (n) => ({ ...n, value: "5" }));
  assert.equal(root.children[0].children[0].value, "5");
  root = removeNode(root, inner.id);
  assert.equal(root.children.length, 0);
});

test("changing the field resets an operator that no longer applies", () => {
  const c = cond("note", "contains", "hi");
  const r = retarget(c, fields[0]);
  assert.equal(r.op, "is");
  assert.equal(r.value, "");
  assert.equal(retarget(c, fields[2]).value, "hi");
});

test("AND / OR evaluation", () => {
  const root = { ...newGroup("and"), children: [cond("amount", "gte", "100"), { ...newGroup("or"), children: [cond("country", "is", "sa"), cond("note", "contains", "URGENT")] }] };
  assert.equal(evaluateConditions(root, { amount: 150, country: "sa" }, fields), true);
  assert.equal(evaluateConditions(root, { amount: 150, country: "eg", note: "Urgent order" }, fields), true);
  assert.equal(evaluateConditions(root, { amount: 150, country: "eg" }, fields), false);
  assert.equal(evaluateConditions(root, { amount: 50, country: "sa" }, fields), false);
  assert.equal(evaluateConditions(newGroup("or"), {}, fields), true);
  assert.equal(evaluateConditions({ ...newGroup("and"), children: [cond("note", "isEmpty", "")] }, {}, fields), true);
  assert.equal(evaluateConditions({ ...newGroup("and"), children: [cond("amount", "gt", "1")] }, { amount: "" }, fields), false);
});

test("validation", () => {
  const actionTypes = [{ id: "mail", label: "Send email", fields: [{ name: "to", label: "To", kind: "text", required: true }] }];
  const bad = { ...emptyRule(), conditions: { ...newGroup("and"), children: [cond("note", "is", "")] } };
  assert.deepEqual(validateRule(bad, fields, actionTypes).map((i) => i.code).sort(), ["no-actions", "no-event", "no-value"]);
  const ok = { event: "e", conditions: newGroup(), actions: [{ id: "a", type: "mail", config: { to: "x@y.z" } }] };
  assert.deepEqual(validateRule(ok, fields, actionTypes), []);
  const missing = { ...ok, actions: [{ id: "a", type: "mail", config: {} }] };
  assert.equal(validateRule(missing, fields, actionTypes)[0].code, "action-field");
});

test("sentence", () => {
  const words = { when: (e) => `When ${e}`, ifWord: "if", then: "then", noConditions: "always", ops: { is: "is", gt: "is greater than", contains: "contains" }, join: (j) => j };
  const rule = { event: "order", conditions: { ...newGroup("and"), children: [cond("amount", "gt", "100"), cond("country", "is", "sa")] }, actions: [{ id: "a", type: "mail", config: {} }] };
  const s = describeRule(rule, fields, [{ id: "order", label: "an order is placed" }], [{ id: "mail", label: "send an email" }], words);
  assert.equal(s, "When an order is placed, if Amount is greater than 100 and Country is Saudi Arabia, then send an email");
  assert.match(describeRule({ ...rule, conditions: newGroup() }, fields, [], [], words), /always/);
});
