import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeHtml, fillVariables, findVariables, renderEmailDocument, unknownVariables } from "../src/components/email-templates/email-render.ts";

const vars = [
  { key: "first_name", label: "First name", sample: "Sara" },
  { key: "note", label: "Note", sample: "<b>hi</b> & bye" },
];

test("findVariables lists distinct keys in order", () => {
  assert.deepEqual(findVariables("Hi {{first_name}}, {{ note }} and {{first_name}}"), ["first_name", "note"]);
  assert.deepEqual(findVariables("no variables"), []);
});

test("fillVariables substitutes samples and keeps unknown keys visible", () => {
  assert.equal(fillVariables("Hi {{first_name}} {{missing}}", vars), "Hi Sara {{missing}}");
  assert.equal(fillVariables("{{ first_name }}", vars), "Sara");
});

test("fillVariables escapes values in html mode only", () => {
  assert.equal(fillVariables("{{note}}", vars, { html: true }), "&lt;b&gt;hi&lt;/b&gt; &amp; bye");
  assert.equal(fillVariables("{{note}}", vars), "<b>hi</b> & bye");
});

test("unknownVariables reports keys not defined", () => {
  assert.deepEqual(unknownVariables("{{first_name}} {{nope}} {{nope}}", vars), ["nope"]);
});

test("escapeHtml", () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
});

test("renderEmailDocument sets direction, language and preheader, and fills the body", () => {
  const rtl = renderEmailDocument({ body: "<p>{{first_name}}</p>", preheader: "Hi {{first_name}}", dir: "rtl", variables: vars });
  assert.match(rtl, /<html lang="ar" dir="rtl">/);
  assert.match(rtl, /<p>Sara<\/p>/);
  assert.match(rtl, /class="pre">Hi Sara</);
  const ltr = renderEmailDocument({ body: "<p>x</p>" });
  assert.match(ltr, /<html lang="en" dir="ltr">/);
  assert.doesNotMatch(ltr, /class="pre"/);
  assert.doesNotMatch(ltr, /class="foot"/);
});

test("renderEmailDocument escapes injected variable values", () => {
  const html = renderEmailDocument({ body: "<p>{{note}}</p>", variables: vars });
  assert.doesNotMatch(html, /<b>hi<\/b>/);
  assert.match(html, /&lt;b&gt;hi&lt;\/b&gt;/);
});
