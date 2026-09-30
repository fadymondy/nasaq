import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildFormSubmission,
  contactFormDefinition,
  formDigits,
  formEmbedSnippet,
  formFieldStates,
  formatFormOptions,
  formOriginAllowed,
  formText,
  moveFormField,
  newFormField,
  newFormRule,
  normalizeFormOrigin,
  parseFormOptions,
  parseFormOrigins,
  uniqueFormFieldId,
  validateFormValues,
} from "../src/components/public-form/form-model.ts";

const cond = (field, op, value) => ({ kind: "condition", id: `c-${field}`, field, op, value });
const rule = (action, target, ...conditions) => {
  const r = newFormRule(action);
  r.actions[0].config.target = target;
  r.conditions.children = conditions;
  return r;
};

test("origins are closed by default: an empty list allows nothing", () => {
  assert.equal(formOriginAllowed([], "https://example.com"), false);
});

test("origins normalise scheme, case, path and port", () => {
  assert.equal(normalizeFormOrigin(" HTTPS://Example.com/contact?x=1 "), "https://example.com");
  assert.equal(normalizeFormOrigin("http://localhost:3000/"), "http://localhost:3000");
  assert.equal(normalizeFormOrigin("example.com"), null);
  assert.equal(normalizeFormOrigin("ftp://example.com"), null);
  assert.equal(normalizeFormOrigin("https://*.com"), null);
});

test("parses a comma list with Arabic commas, dropping junk and duplicates", () => {
  assert.deepEqual(parseFormOrigins("https://a.com, https://A.com/x، nope, https://b.io:8080"), ["https://a.com", "https://b.io:8080"]);
});

test("origin matching: exact, port, scheme and wildcard subdomains", () => {
  const list = ["https://example.com", "https://*.shop.io", "http://localhost:3000"];
  assert.equal(formOriginAllowed(list, "https://example.com"), true);
  assert.equal(formOriginAllowed(list, "http://example.com"), false);
  assert.equal(formOriginAllowed(list, "https://www.example.com"), false);
  assert.equal(formOriginAllowed(list, "https://a.shop.io"), true);
  assert.equal(formOriginAllowed(list, "https://shop.io"), false);
  assert.equal(formOriginAllowed(list, "https://evilshop.io"), false);
  assert.equal(formOriginAllowed(list, "http://localhost:3000"), true);
  assert.equal(formOriginAllowed(list, "http://localhost:4000"), false);
});

test("embed snippets", () => {
  const iframe = formEmbedSnippet({ baseUrl: "https://forms.example.com/", formKey: "pk_123", title: "Contact" });
  assert.match(iframe, /^<iframe src="https:\/\/forms\.example\.com\/f\/pk_123" title="Contact"/);
  const script = formEmbedSnippet({ baseUrl: "https://forms.example.com", formKey: "pk_123", style: "script" });
  assert.match(script, /data-nasaq-form="pk_123"/);
  assert.match(script, /src="https:\/\/forms\.example\.com\/embed\.js"/);
});

test("contact form validates required fields, email and topic", () => {
  const form = contactFormDefinition();
  assert.deepEqual(validateFormValues(form, {}), { name: "required", email: "required", topic: "required", message: "required" });
  const bad = validateFormValues(form, { name: "Sara", email: "sara@", topic: "sales", message: "Hi" });
  assert.deepEqual(bad, { email: "email" });
  assert.deepEqual(validateFormValues(form, { name: "Sara", email: "sara@example.com", topic: "sales", message: "Hi" }), {});
});

test("phone and number checks, Arabic digits accepted for numbers", () => {
  const form = { fields: [{ id: "p", kind: "phone", label: "P" }, { id: "n", kind: "number", label: "N" }], rules: [] };
  assert.deepEqual(validateFormValues(form, { p: "0501", n: "abc" }), { p: "phone", n: "number" });
  assert.deepEqual(validateFormValues(form, { p: "+966 50 123 4567", n: "١٢٫٥" }), {});
  assert.equal(formDigits("١٢٫٥ ۳"), "12.5 3");
});

test("a checkbox required means it must be ticked", () => {
  const form = { fields: [{ id: "terms", kind: "checkbox", label: "T", required: true }], rules: [] };
  assert.deepEqual(validateFormValues(form, { terms: false }), { terms: "required" });
  assert.deepEqual(validateFormValues(form, { terms: true }), {});
});

test("show rules hide the field until they match; hide and require react to answers", () => {
  const form = {
    fields: [
      { id: "topic", kind: "select", label: "Topic" },
      { id: "order", kind: "text", label: "Order number" },
      { id: "budget", kind: "number", label: "Budget" },
      { id: "company", kind: "text", label: "Company" },
    ],
    rules: [
      rule("show", "order", cond("topic", "is", "support")),
      rule("hide", "budget", cond("topic", "is", "support")),
      rule("require", "company", cond("topic", "is", "sales")),
    ],
  };
  let s = formFieldStates(form, { topic: "sales" });
  assert.deepEqual([s.order.visible, s.budget.visible, s.company.required], [false, true, true]);
  s = formFieldStates(form, { topic: "support" });
  assert.deepEqual([s.order.visible, s.budget.visible, s.company.required], [true, false, false]);
});

test("hidden fields are not validated or sent", () => {
  const form = {
    ...contactFormDefinition(),
    fields: [
      { id: "topic", kind: "select", label: "Topic" },
      { id: "order", kind: "text", label: "Order", required: true },
    ],
    rules: [rule("show", "order", cond("topic", "is", "support"))],
  };
  assert.deepEqual(validateFormValues(form, { topic: "sales" }), {});
  assert.deepEqual(validateFormValues(form, { topic: "support" }), { order: "required" });
  assert.deepEqual(buildFormSubmission(form, { topic: "sales", order: "A-1" }).data, { topic: "sales" });
});

test("numeric conditions compare numbers", () => {
  const form = {
    fields: [{ id: "seats", kind: "number", label: "Seats" }, { id: "note", kind: "text", label: "Note" }],
    rules: [rule("show", "note", cond("seats", "gte", "10"))],
  };
  assert.equal(formFieldStates(form, { seats: "9" }).note.visible, false);
  assert.equal(formFieldStates(form, { seats: "١٠" }).note.visible, true);
});

test("honeypot: a filled hidden field marks the submission as spam", () => {
  const form = contactFormDefinition();
  const values = { name: "Sara", email: "s@example.com", topic: "sales", message: " hi " };
  assert.deepEqual(buildFormSubmission(form, values), { data: { name: "Sara", email: "s@example.com", topic: "sales", message: "hi" }, spam: false });
  assert.equal(buildFormSubmission(form, { ...values, website_url: "http://spam" }).spam, true);
  assert.equal(buildFormSubmission({ ...form, honeypot: false }, { ...values, website_url: "x" }).spam, false);
});

test("field helpers: unique ids, move, options round trip", () => {
  const fields = [newFormField("text", []), newFormField("text", [{ id: "text" }])];
  assert.deepEqual(fields.map((f) => f.id), ["text", "text_2"]);
  assert.equal(uniqueFormFieldId("email", fields), "email");
  assert.deepEqual(moveFormField(fields, "text", 1).map((f) => f.id), ["text_2", "text"]);
  assert.deepEqual(moveFormField(fields, "text", -1).map((f) => f.id), ["text", "text_2"]);
  const options = parseFormOptions("Riyadh | الرياض\nJeddah\n | مكة\nJeddah");
  assert.deepEqual(options.map((o) => o.value), ["riyadh", "jeddah", "option-3", "jeddah-4"]);
  assert.equal(options[0].labelAr, "الرياض");
  assert.equal(formatFormOptions(parseFormOptions("A | أ\nB")), "A | أ\nB");
  assert.equal(newFormField("select", []).options.length, 2);
});

test("formText picks by locale with fallback", () => {
  assert.equal(formText("Hi", "مرحبا", "ar-SA"), "مرحبا");
  assert.equal(formText("Hi", "", "ar"), "Hi");
  assert.equal(formText("", "مرحبا", "en"), "مرحبا");
});
