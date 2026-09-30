import assert from "node:assert/strict";
import { test } from "node:test";
import "./_ts-resolve.mjs";

const { newFormRule } = await import("../src/components/public-form/form-model.ts");
const {
  SCHEMA_FORM_MESSAGES,
  schemaFormItemSummary,
  schemaFormItemTitle,
  schemaFormMapErrors,
  schemaFormPathLabel,
  schemaFormTree,
  schemaFormTreeDefaults,
  schemaFormTreeHasData,
  schemaFormTreeInitial,
  schemaFormTreeOutput,
  schemaFormTreeStates,
  schemaFormTreeValidate,
} = await import("../src/components/schema-form/schema-tree.ts");

const schema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", title: "Name" },
    tags: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3, uniqueItems: true },
    scores: { type: "array", items: { type: "integer", minimum: 0 }, maxItems: 2 },
    channels: { type: "array", uniqueItems: true, items: { type: "string", enum: ["sms", "email", "push"] } },
    address: { type: "object", required: ["city"], title: "Address", properties: { city: { type: "string" }, geo: { type: "object", properties: { lat: { type: "number" } } } } },
    contacts: {
      type: "array",
      title: "Contacts",
      minItems: 1,
      maxItems: 3,
      "x-title": "name",
      items: {
        type: "object",
        title: "Contact",
        required: ["name", "phone"],
        properties: {
          name: { type: "string", title: "Name" },
          kind: { type: "string", enum: ["person", "company"], default: "person" },
          vat: { type: "string", title: "VAT" },
          phone: { type: "string", title: "Phone" },
          phones: { type: "array", items: { type: "string" }, maxItems: 2 },
        },
      },
    },
  },
};

const { root } = schemaFormTree(schema);
const messages = SCHEMA_FORM_MESSAGES.en;
const validate = (values, options = {}) => schemaFormTreeValidate(root, values, { messages, ...options });
const rule = (action, target, ...conditions) => {
  const r = newFormRule(action);
  r.actions[0].config.target = target;
  r.conditions.children = conditions;
  return r;
};
const cond = (field, op, value) => ({ kind: "condition", id: `c-${field}`, field, op, value });
const contactsList = root.children.find((c) => c.key === "contacts");

test("list modes follow the item schema", () => {
  const by = Object.fromEntries(root.children.map((c) => [c.key, c]));
  assert.equal(by.tags.mode, "tags");
  assert.equal(by.scores.mode, "items");
  assert.equal(by.channels.mode, "checkboxes");
  assert.equal(by.contacts.mode, "groups");
  assert.equal(by.address.kind, "object");
  assert.equal(by.address.children.find((c) => c.key === "geo").kind, "object");
});

test("defaults for nested and array values", () => {
  const d = schemaFormTreeDefaults(root);
  assert.deepEqual(d.tags, []);
  assert.equal(d.address.city, "");
  assert.ok("lat" in d.address.geo);
  assert.deepEqual(d.contacts, []);
  const item = schemaFormTreeDefaults(contactsList.item);
  assert.equal(item.kind, "person");
  assert.deepEqual(item.phones, []);
});

test("initial values keep what is given and fill what is missing, at any depth", () => {
  const v = schemaFormTreeInitial(root, { name: "Acme", contacts: [{ name: "Sara" }], address: { city: "Jeddah" } });
  assert.equal(v.contacts[0].kind, "person");
  assert.deepEqual(v.contacts[0].phones, []);
  assert.equal(v.address.city, "Jeddah");
  assert.ok("lat" in v.address.geo);
});

test("output nests, keeps numbers and drops hidden paths", () => {
  const values = schemaFormTreeInitial(root, { name: "A", scores: [3], contacts: [{ name: "S", vat: "1", phone: "9" }] });
  const out = schemaFormTreeOutput(root, values, { visible: (p) => p !== "contacts[0].vat" });
  assert.deepEqual(out.scores, [3]);
  assert.equal("vat" in out.contacts[0], false);
  assert.equal(out.contacts[0].phone, "9");
});

test("minItems, maxItems and uniqueItems are reported on the list", () => {
  const good = { name: "A", tags: ["a"], address: { city: "c" }, contacts: [{ name: "S", phone: "1", kind: "person", phones: [] }] };
  assert.deepEqual(validate(good), {});
  assert.ok(validate({ ...good, tags: [] }).tags);
  assert.ok(validate({ ...good, tags: ["a", "b", "c", "d"] }).tags);
  assert.match(validate({ ...good, tags: ["a", "a"] }).tags, /twice/);
  assert.ok(validate({ ...good, scores: [1, 2, 3] }).scores);
  assert.ok(validate({ ...good, contacts: [] }).contacts);
  assert.ok(validate({ ...good, contacts: Array.from({ length: 4 }, () => good.contacts[0]) }).contacts);
});

test("nested required and item rules report by full path", () => {
  const issues = validate({ name: "A", tags: ["x"], address: { city: "" }, contacts: [{ name: "S", phone: "1" }, { name: "T", phone: "", phones: ["5"] }] });
  assert.ok(issues["address.city"]);
  assert.ok(issues["contacts[1].phone"]);
  assert.equal(issues["contacts[0].phone"], undefined);
  const numbers = validate({ name: "A", tags: ["x"], address: { city: "c" }, contacts: [{ name: "S", phone: "1" }], scores: [-1] });
  assert.ok(numbers["scores[0]"]);
});

test("server errors land on the field, however the path is spelled", () => {
  const values = { name: "A", contacts: [{ name: "S" }, { name: "T", phones: ["1"] }] };
  const map = schemaFormMapErrors(root, values, {
    "contacts[1].phone": "Already used",
    "contacts.0.name": "Taken",
    "/address/city": "Unknown city",
    "contacts[1].phones[0]": "Bad phone",
  });
  assert.equal(map.fields["contacts[1].phone"], "Already used");
  assert.equal(map.fields["contacts[0].name"], "Taken");
  assert.equal(map.fields["address.city"], "Unknown city");
  assert.equal(map.fields["contacts[1].phones"], "Bad phone");
  assert.deepEqual(map.unmatched, []);
});

test("server errors that lead nowhere are returned, and a gone item lands on its list", () => {
  const values = { name: "A", contacts: [{ name: "S" }] };
  const map = schemaFormMapErrors(root, values, { nothing: "x", "contacts[4].phone": "gone" });
  assert.deepEqual(map.unmatched, [{ path: "nothing", message: "x" }]);
  assert.equal(map.fields.contacts, "gone");
});

test("rules work inside array items with relative references", () => {
  const rules = [rule("show", "contacts[].vat", cond("./kind", "is", "company")), rule("require", "contacts[].vat", cond("./kind", "is", "company"))];
  const values = schemaFormTreeInitial(root, { name: "A", tags: ["x"], address: { city: "c" }, contacts: [{ name: "P", phone: "1", kind: "person" }, { name: "C", phone: "2", kind: "company" }] });
  const s = schemaFormTreeStates(root, values, rules);
  assert.equal(s["contacts[0].vat"].visible, false);
  assert.equal(s["contacts[1].vat"].visible, true);
  assert.equal(s["contacts[1].vat"].required, true);
  assert.equal(s["contacts[0].vat"].required, false);
  const issues = validate(values, { states: s });
  assert.equal(issues["contacts[0].vat"], undefined);
  assert.ok(issues["contacts[1].vat"]);
});

test("rules can read the enclosing form and absolute paths, and hidden objects are skipped", () => {
  const rules = [rule("hide", "contacts[].phones", cond("../name", "is", "Solo")), rule("hide", "address", cond("name", "is", "Nomad"))];
  const nomad = schemaFormTreeInitial(root, { name: "Nomad", contacts: [{ name: "Solo" }] });
  const s = schemaFormTreeStates(root, nomad, rules);
  assert.equal(s.address.visible, false);
  assert.equal(s["address.city"].visible, false);
  assert.equal(validate({ ...nomad, address: { city: "" } }, { states: s })["address.city"], undefined);
  const solo = schemaFormTreeInitial(root, { name: "Solo", contacts: [{ name: "x" }] });
  assert.equal(schemaFormTreeStates(root, solo, rules)["contacts[0].phones"].visible, false);
});

test("group titles, summaries, data checks and path labels", () => {
  const value = { name: "Sara", kind: "company", phone: "9" };
  assert.equal(schemaFormItemTitle(contactsList, value, 0).title, "Sara");
  assert.equal(schemaFormItemTitle(contactsList, { name: "" }, 1).title, "Contact 2");
  assert.match(schemaFormItemSummary(contactsList, value, ["name"]), /9/);
  assert.equal(schemaFormTreeHasData(contactsList.item, schemaFormTreeDefaults(contactsList.item)), false);
  assert.equal(schemaFormTreeHasData(contactsList.item, value), true);
  assert.equal(schemaFormPathLabel(root, "contacts[1].phone"), "Contact 2 › Phone");
});
