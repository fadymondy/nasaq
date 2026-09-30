import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTACT_MERGE_ALL,
  combineMergeLists,
  contactMergeConflict,
  defaultContactMergeChoices,
  isEmptyMergeValue,
  rebaseContactMergeChoices,
  resolveContactMerge,
} from "../src/components/contact-merge/contact-merge-logic.ts";

const fields = [
  { id: "name", label: "Name" },
  { id: "phone", label: "Phone" },
  { id: "title", label: "Title" },
  { id: "tags", label: "Tags", multi: true },
];
const a = { id: "a", values: { name: "Sara Ali", phone: "", title: "Founder", tags: ["vip", "renewal"] } };
const b = { id: "b", values: { name: "Sara A.", phone: "+966 50 111 2222", title: "Founder", tags: ["renewal", "partner"] } };

test("empty values", () => {
  assert.equal(isEmptyMergeValue(""), true);
  assert.equal(isEmptyMergeValue("  "), true);
  assert.equal(isEmptyMergeValue([]), true);
  assert.equal(isEmptyMergeValue(["x"]), false);
});

test("a conflict needs two different non-empty values", () => {
  assert.equal(contactMergeConflict(fields[0], [a, b]), true);
  assert.equal(contactMergeConflict(fields[1], [a, b]), false); // one side is empty
  assert.equal(contactMergeConflict(fields[2], [a, b]), false); // identical
  assert.equal(contactMergeConflict(fields[3], [a, b]), true);
});

test("defaults keep the survivor, fill blanks from others, combine lists", () => {
  assert.deepEqual(defaultContactMergeChoices(fields, [a, b], "a"), { name: "a", phone: "b", title: "a", tags: CONTACT_MERGE_ALL });
  assert.equal(defaultContactMergeChoices(fields, [a, b], "b").name, "b");
});

test("resolves values and the records that are folded in", () => {
  const out = resolveContactMerge(fields, [a, b], "a", { name: "b", phone: "b", title: "a", tags: CONTACT_MERGE_ALL });
  assert.equal(out.survivorId, "a");
  assert.deepEqual(out.mergedIds, ["b"]);
  assert.equal(out.values.name, "Sara A.");
  assert.deepEqual(out.values.tags, ["vip", "renewal", "partner"]);
  const one = resolveContactMerge(fields, [a, b], "a", { name: "a", phone: "b", title: "a", tags: "b" });
  assert.deepEqual(one.values.tags, ["renewal", "partner"]);
});

test("list union keeps first-seen order and drops duplicates", () => {
  assert.deepEqual(combineMergeLists([["x", "y"], ["y", "z"], undefined, "w"]), ["x", "y", "z", "w"]);
});

test("changing the survivor moves only the fields still on the default", () => {
  const before = { name: "b", phone: "b", title: "a", tags: CONTACT_MERGE_ALL }; // name was chosen by hand
  const next = rebaseContactMergeChoices(fields, [a, b], before, "a", "b");
  assert.equal(next.name, "b");
  assert.equal(next.title, "b");
});
