import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRows, checkType, detectDelimiter, guessMapping, parseCsv, summarize, unmappedRequired } from "../src/components/import-wizard/import-wizard-csv.ts";

const fields = [
  { key: "name", label: "Name", required: true, aliases: ["الاسم"] },
  { key: "email", label: "Email", type: "email", aliases: ["e-mail", "البريد"] },
  { key: "phone", label: "Phone", type: "phone" },
];

test("parseCsv handles quotes, doubled quotes, embedded newlines, CRLF and BOM", () => {
  const csv = parseCsv('﻿name,note\r\n"Sara, K","said ""hi"""\r\n"Omar","line1\nline2"\r\n\r\n');
  assert.deepEqual(csv.headers, ["name", "note"]);
  assert.deepEqual(csv.rows, [["Sara, K", 'said "hi"'], ["Omar", "line1\nline2"]]);
});

test("detectDelimiter picks semicolon, tab and comma", () => {
  assert.equal(detectDelimiter("a;b;c\n1;2;3"), ";");
  assert.equal(detectDelimiter("a\tb\tc"), "\t");
  assert.equal(detectDelimiter('"a,b";c;d'), ";");
  assert.equal(detectDelimiter("a,b,c"), ",");
});

test("guessMapping matches keys, labels and Arabic aliases, each column once", () => {
  assert.deepEqual(guessMapping(["الاسم", "E-Mail", "Mobile"], fields), { name: 0, email: 1, phone: null });
  assert.deepEqual(guessMapping(["name", "name"], fields), { name: 0, email: null, phone: null });
});

test("checkType", () => {
  assert.equal(checkType("a@b.co", "email"), null);
  assert.equal(checkType("nope", "email"), "email");
  assert.equal(checkType("+966 50 123 4567", "phone"), null);
  assert.equal(checkType("12", "phone"), "phone");
  assert.equal(checkType("1,200.5", "number"), null);
  assert.equal(checkType("abc", "number"), "number");
  assert.equal(checkType("2026-09-30", "date"), null);
  assert.equal(checkType("", "email"), null);
});

test("buildRows flags required, type and duplicate problems with source line numbers", () => {
  const { rows } = parseCsv("name,email\nSara,sara@x.co\n,bad\nOmar,SARA@x.co");
  const built = buildRows(rows, { name: 0, email: 1, phone: null }, fields, { uniqueKey: "email" });
  assert.deepEqual(built.map((r) => r.line), [2, 3, 4]);
  assert.deepEqual(built[0].issues, []);
  assert.deepEqual(built[1].issues.map((i) => i.code), ["required", "email"]);
  assert.deepEqual(built[2].issues, [{ field: "email", code: "duplicate" }]);
  assert.deepEqual(summarize(built), { total: 3, valid: 1, invalid: 2, duplicates: 1 });
});

test("unmappedRequired", () => {
  assert.deepEqual(unmappedRequired({ name: null, email: 1, phone: null }, fields).map((f) => f.key), ["name"]);
  assert.equal(unmappedRequired({ name: 0 }, fields).length, 0);
});
