import assert from "node:assert/strict";
import { test } from "node:test";
import { schemaFormFields, schemaFormHumanize, schemaFormInitial, schemaFormOutput, schemaFormResolve } from "../src/components/schema-form/schema-fields.ts";

const schema = {
  type: "object",
  required: ["name", "email"],
  $defs: { money: { type: "number", minimum: 0, "x-unit": "SAR" } },
  properties: {
    name: { type: "string", title: "Name", "x-title-ar": "الاسم", maxLength: 80 },
    email: { type: "string", format: "email" },
    bio: { type: "string", "x-widget": "textarea" },
    born: { type: "string", format: "date" },
    tier: { type: "integer", enum: [1, 2, 3] },
    status: { type: "string", oneOf: [{ const: "on", title: "On", "x-title-ar": "مفعل" }, { const: "off", title: "Off" }] },
    vip: { type: "boolean", default: true },
    credit: { $ref: "#/$defs/money" },
    owner: { type: "string", "x-relation": { resource: "users" } },
    tags: { type: "array", items: { type: "string" } },
    address: { type: "object", required: ["city"], title: "Address", properties: { city: { type: "string" }, zip: { type: "string" } } },
    lines: { type: "array", minItems: 1, items: { type: "object", properties: { sku: { type: "string" }, qty: { type: "integer", minimum: 1 } } } },
  },
};

test("maps types to fields", () => {
  const plan = schemaFormFields(schema);
  const by = Object.fromEntries(plan.fields.map((f) => [f.key, f]));
  assert.equal(by.name.type, "text");
  assert.equal(by.name.required, true);
  assert.equal(by.name.maxLength, 80);
  assert.equal(by.email.inputType, "email");
  assert.equal(by.email.ltr, true);
  assert.equal(by.bio.multiline, true);
  assert.equal(by.born.type, "date");
  assert.equal(by.tier.type, "select");
  assert.deepEqual(by.tier.options.map((o) => o.value), ["1", "2", "3"]);
  assert.equal(by.vip.type, "switch");
  assert.equal(by.vip.defaultValue, true);
  assert.equal(by.credit.type, "number");
  assert.equal(by.credit.unit, "SAR");
  assert.deepEqual(by.owner.relation, { resource: "users", multiple: false });
  assert.equal(by.lines.type, "repeater");
  assert.equal(by.lines.min, 1);
  assert.equal(by.lines.fields[1].integer, true);
});

test("labels follow the locale and fall back to the humanised key", () => {
  assert.equal(schemaFormFields(schema).fields[0].label, "Name");
  assert.equal(schemaFormFields(schema, { locale: "ar" }).fields[0].label, "الاسم");
  assert.equal(schemaFormFields(schema).fields.find((f) => f.key === "credit").label, "Credit");
  assert.equal(schemaFormFields(schema, { locale: "ar" }).fields.find((f) => f.key === "status").options[0].label, "مفعل");
  assert.equal(schemaFormHumanize("first_name"), "First name");
  assert.equal(schemaFormHumanize("firstName"), "First name");
});

test("nested objects become sections with dotted keys", () => {
  const plan = schemaFormFields(schema);
  assert.deepEqual(plan.sections, [{ id: "address", title: "Address" }]);
  const city = plan.fields.find((f) => f.key === "address.city");
  assert.equal(city.section, "address");
  assert.equal(city.required, true);
});

test("reports what it cannot draw", () => {
  const plan = schemaFormFields(schema);
  assert.deepEqual(plan.unsupported.map((u) => u.key), ["tags"]);
});

test("resolves local refs and ignores foreign ones", () => {
  assert.equal(schemaFormResolve(schema.properties.credit, schema).type, "number");
  const foreign = { $ref: "https://x.test/a.json" };
  assert.equal(schemaFormResolve(foreign, schema), foreign);
});

test("initial values take defaults and given values", () => {
  const plan = schemaFormFields(schema);
  const values = schemaFormInitial(plan, { name: "Ada", tier: 2, address: { city: "Riyadh" } });
  assert.equal(values.name, "Ada");
  assert.equal(values.tier, "2");
  assert.equal(values.vip, true);
  assert.equal(values["address.city"], "Riyadh");
  assert.deepEqual(values.lines, []);
  assert.equal(values.owner, "");
});

test("output nests sections, restores numbers and nulls empty text", () => {
  const plan = schemaFormFields(schema);
  const out = schemaFormOutput(plan, { ...schemaFormInitial(plan), name: "Ada", tier: "3", "address.city": "Riyadh", "address.zip": "" });
  assert.equal(out.tier, 3);
  assert.equal(out.bio, null);
  assert.equal(out.owner, null);
  assert.deepEqual(out.address, { city: "Riyadh", zip: null });
});
