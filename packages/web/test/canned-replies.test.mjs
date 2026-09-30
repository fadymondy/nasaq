import assert from "node:assert/strict";
import test from "node:test";
import { cannedReplyVariables, nextFreeCannedShortcut, normalizeCannedShortcut, validateCannedReply } from "../src/components/canned-replies/canned-replies-logic.ts";

test("shortcut clean-up", () => {
  assert.equal(normalizeCannedShortcut(" /Refund Policy! "), "refund-policy");
  assert.equal(normalizeCannedShortcut("//رد سريع"), "رد-سريع");
  assert.equal(normalizeCannedShortcut("///"), "");
});

test("variables in first-use order", () => {
  assert.deepEqual(cannedReplyVariables("Hi {{name}}, from {{ agent }}. {{name}} again"), ["name", "agent"]);
});

test("validation", () => {
  const others = [{ id: "1", shortcut: "hello", title: "Hello", body: "Hi" }];
  assert.deepEqual(validateCannedReply({ id: "2", shortcut: "", title: "", body: "" }, others), ["title-empty", "shortcut-empty", "body-empty"]);
  assert.deepEqual(validateCannedReply({ id: "2", shortcut: "/Hello", title: "x", body: "y" }, others), ["shortcut-duplicate"]);
  assert.deepEqual(validateCannedReply({ id: "1", shortcut: "hello", title: "x", body: "y" }, others), []);
  assert.deepEqual(validateCannedReply({ id: "3", shortcut: "a", title: "x", body: "Hi {{oops}}" }, others, ["name"]), ["variable-unknown"]);
});

test("next free shortcut", () => {
  assert.equal(nextFreeCannedShortcut("refund", [{ shortcut: "refund" }, { shortcut: "refund-2" }]), "refund-3");
  assert.equal(nextFreeCannedShortcut("new", []), "new");
});
