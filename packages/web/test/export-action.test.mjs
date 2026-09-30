import assert from "node:assert/strict";
import test from "node:test";
import { buildExportFile, cellToText, crc32, csvField, toCsv, toJson, toXlsx } from "../src/components/export-action/export-formats.ts";

const cols = [
  { id: "name", label: "Name" },
  { id: "note", label: "Note", value: (r) => r.note },
];

test("csvField quotes commas, quotes and newlines", () => {
  assert.equal(csvField("plain"), "plain");
  assert.equal(csvField("a,b"), '"a,b"');
  assert.equal(csvField('say "hi"'), '"say ""hi"""');
  assert.equal(csvField("line1\nline2"), '"line1\nline2"');
});

test("toCsv writes rows with CRLF and neutralises formulas", () => {
  const csv = toCsv([["Name", "Note"], ["Sara", "=SUM(A1)"], ["علي", "مرحبا, بالعالم"], ["n", -5]]);
  const lines = csv.split("\r\n");
  assert.equal(lines[0], "Name,Note");
  assert.equal(lines[1], "Sara,'=SUM(A1)");
  assert.equal(lines[2], 'علي,"مرحبا, بالعالم"');
  assert.equal(lines[3], "n,-5");
});

test("toCsv can add a BOM, change the delimiter and skip the guard", () => {
  const csv = toCsv([["x", "=1"]], { bom: true, guardFormulas: false, delimiter: ";" });
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.endsWith("x;=1"));
});

test("cellToText handles null, dates, booleans and objects", () => {
  assert.equal(cellToText(null), "");
  assert.equal(cellToText(undefined), "");
  assert.equal(cellToText(true), "true");
  assert.equal(cellToText(new Date("2026-01-02T03:04:05Z")), "2026-01-02T03:04:05.000Z");
  assert.equal(cellToText({ a: 1 }), '{"a":1}');
});

test("toJson prints records", () => {
  assert.deepEqual(JSON.parse(toJson([{ a: 1n, b: "x" }])), [{ a: "1", b: "x" }]);
});

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("toXlsx produces a zip with the workbook parts", () => {
  const bytes = toXlsx([["Name", "Note"], ["Sara", "hello & <bye>"]], { sheetName: "People" });
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  const text = Buffer.from(bytes).toString("latin1");
  for (const part of ["[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]) assert.ok(text.includes(part), part);
  assert.ok(text.includes("hello &amp; &lt;bye&gt;"));
  assert.ok(text.includes("People"));
});

test("buildExportFile builds all formats, reports progress and can be aborted", async () => {
  const rows = Array.from({ length: 1200 }, (_, i) => ({ name: `n${i}`, note: "x" }));
  const seen = [];
  const csv = await buildExportFile({ format: "csv", columns: cols, rows, onProgress: (p) => seen.push(p), chunk: 500 });
  assert.equal(new TextDecoder().decode(csv).split("\r\n").length, 1201);
  assert.equal(seen.at(-1), 1);
  assert.ok(seen.length > 1);

  const json = JSON.parse(new TextDecoder().decode(await buildExportFile({ format: "json", columns: cols, rows: rows.slice(0, 2) })));
  assert.deepEqual(json[0], { name: "n0", note: "x" });

  const xlsx = await buildExportFile({ format: "xlsx", columns: cols, rows: rows.slice(0, 2) });
  assert.equal(xlsx[0], 0x50);

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(buildExportFile({ format: "csv", columns: cols, rows, signal: controller.signal }));
});
