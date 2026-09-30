import assert from "node:assert/strict";
import { test } from "node:test";
import {
  schemaPathFormat,
  schemaPathGet,
  schemaPathIndices,
  schemaPathInside,
  schemaPathMatches,
  schemaPathNormalize,
  schemaPathParent,
  schemaPathParse,
  schemaPathPattern,
  schemaPathResolve,
  schemaPathSet,
} from "../src/components/schema-form/schema-path.ts";

test("parses dotted, bracketed, numeric and pointer spellings to one path", () => {
  assert.deepEqual(schemaPathParse("contacts[1].phone"), ["contacts", 1, "phone"]);
  assert.equal(schemaPathNormalize("contacts.1.phone"), "contacts[1].phone");
  assert.equal(schemaPathNormalize("/contacts/1/phone"), "contacts[1].phone");
  assert.equal(schemaPathNormalize("contacts[1].phones[0]"), "contacts[1].phones[0]");
  assert.deepEqual(schemaPathParse(""), []);
});

test("patterns and relatives of a path", () => {
  assert.equal(schemaPathPattern("contacts[1].phones[0]"), "contacts[].phones[]");
  assert.equal(schemaPathParent("contacts[1].phone"), "contacts[1]");
  assert.equal(schemaPathParent("contacts[1]"), "contacts");
  assert.deepEqual(schemaPathIndices("a[2].b[5]"), [2, 5]);
  assert.equal(schemaPathFormat(["a", null, "b"]), "a[].b");
  assert.ok(schemaPathMatches("contacts[].phone", "contacts[3].phone"));
  assert.ok(!schemaPathMatches("contacts[].phone", "contacts.phone"));
  assert.ok(schemaPathInside("contacts[1].phone", "contacts[1]"));
  assert.ok(schemaPathInside("contacts[1].phone", "contacts"));
  assert.ok(!schemaPathInside("contacts[10].phone", "contacts[1]"));
});

test("get reads through objects and arrays and falls back when a step is missing", () => {
  const v = { address: { city: "Riyadh" }, contacts: [{ phones: ["1", "2"] }] };
  assert.equal(schemaPathGet(v, "address.city"), "Riyadh");
  assert.equal(schemaPathGet(v, "contacts[0].phones[1]"), "2");
  assert.equal(schemaPathGet(v, "contacts[3].phones", "none"), "none");
  assert.equal(schemaPathGet(v, "address.zip.x", 7), 7);
});

test("set is immutable, keeps untouched branches and creates missing steps", () => {
  const v = { address: { city: "A" }, contacts: [{ name: "x" }, { name: "y" }] };
  const next = schemaPathSet(v, "contacts[1].name", "z");
  assert.equal(v.contacts[1].name, "y");
  assert.equal(next.contacts[1].name, "z");
  assert.equal(next.address, v.address);
  assert.equal(next.contacts[0], v.contacts[0]);
  const made = schemaPathSet({}, "a.list[2].k", 1);
  assert.deepEqual(made.a.list.length, 3);
  assert.equal(made.a.list[2].k, 1);
});

test("relative references resolve against the field a rule acts on", () => {
  assert.equal(schemaPathResolve("./type", "contacts[1].phone"), "contacts[1].type");
  assert.equal(schemaPathResolve("../kind", "contacts[1].phone"), "kind");
  assert.equal(schemaPathResolve("../kind", "co.contacts[1].phones[0].number"), "co.contacts[1].kind");
  assert.equal(schemaPathResolve("contacts[].type", "contacts[2].phone"), "contacts[2].type");
  assert.equal(schemaPathResolve("company.name", "contacts[2].phone"), "company.name");
});
