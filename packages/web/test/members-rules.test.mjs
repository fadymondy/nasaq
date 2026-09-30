import assert from "node:assert/strict";
import test from "node:test";
import { canLeave, isLastOwner, ownerCount, parseEmails, removeBlock, roleChangeBlock, roleChoices } from "../src/components/members-manager/members-rules.ts";

const roles = [{ id: "owner" }, { id: "admin" }, { id: "member" }, { id: "viewer" }];
const solo = [
  { id: "a", role: "owner" },
  { id: "b", role: "admin" },
  { id: "c", role: "member" },
];
const duo = [...solo, { id: "d", role: "owner" }];

test("the last owner is protected", () => {
  assert.equal(ownerCount(solo), 1);
  assert.equal(isLastOwner(solo[0], solo), true);
  assert.equal(isLastOwner(duo[0], duo), false);
  assert.equal(removeBlock(solo[0], solo, "b"), "self-last-owner");
  assert.equal(removeBlock(duo[0], duo, "b"), null);
  assert.equal(removeBlock(solo[1], solo, "b"), "self");
  assert.equal(canLeave(solo[0], solo), false);
  assert.equal(canLeave(duo[0], duo), true);
  assert.equal(canLeave(solo[1], solo), true);
});

test("role choices keep the current role and hide roles you cannot grant", () => {
  const ids = (list) => list.map((r) => r.id);
  assert.deepEqual(ids(roleChoices(solo[2], roles, ["member", "viewer"])), ["member", "viewer"]);
  assert.deepEqual(ids(roleChoices(solo[2], roles, undefined)), ["admin", "member", "viewer"]);
  // The owner role is only reachable by transfer, but stays visible on the owner's own row.
  assert.deepEqual(ids(roleChoices(duo[0], roles, undefined)), ["owner", "admin", "member", "viewer"]);
});

test("changing a role is blocked for owners and for roles you cannot grant", () => {
  assert.equal(roleChangeBlock(solo[0], solo, undefined), "self-last-owner");
  assert.equal(roleChangeBlock(duo[0], duo, undefined), "owner-only");
  assert.equal(roleChangeBlock(solo[1], solo, ["member"]), "not-grantable");
  assert.equal(roleChangeBlock(solo[2], solo, ["member"]), null);
});

test("parseEmails splits on commas, spaces and Arabic commas and drops repeats", () => {
  assert.deepEqual(parseEmails("a@x.com, b@x.com;A@x.com\nc@x.com،d@x.com"), ["a@x.com", "b@x.com", "c@x.com", "d@x.com"]);
  assert.deepEqual(parseEmails("  "), []);
});
