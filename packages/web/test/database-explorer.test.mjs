import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSelectSql, cellKind, formatCell, isReadOnlySql, pushHistory, quoteIdent, resultToCsv } from "../src/components/database-explorer/database-format.ts";

test("cellKind classifies values", () => {
  assert.equal(cellKind(null), "null");
  assert.equal(cellKind(undefined), "null");
  assert.equal(cellKind(3), "number");
  assert.equal(cellKind(10n), "number");
  assert.equal(cellKind(false), "boolean");
  assert.equal(cellKind(new Date(0)), "date");
  assert.equal(cellKind({ a: 1 }), "json");
  assert.equal(cellKind("x"), "text");
});

test("formatCell renders each kind", () => {
  assert.equal(formatCell(null), "");
  assert.equal(formatCell({ a: 1 }), '{"a":1}');
  assert.equal(formatCell(new Date(0)), "1970-01-01T00:00:00.000Z");
  assert.equal(formatCell(true), "true");
});

test("quoteIdent doubles quotes", () => {
  assert.equal(quoteIdent("users"), '"users"');
  assert.equal(quoteIdent('my "t"'), '"my ""t"""');
});

test("buildSelectSql quotes and limits", () => {
  assert.equal(buildSelectSql("users"), 'SELECT * FROM "users" LIMIT 100;');
  assert.equal(buildSelectSql("users", "public", 5), 'SELECT * FROM "public"."users" LIMIT 5;');
  assert.equal(buildSelectSql("t", undefined, 0), 'SELECT * FROM "t" LIMIT 1;');
});

test("resultToCsv escapes and guards formulas", () => {
  const csv = resultToCsv(["id", "note"], [[1, 'say "hi", ok'], [2, "=SUM(A1)"], [3, null]]);
  assert.equal(csv, ['id,note', '1,"say ""hi"", ok"', "2,'=SUM(A1)", "3,"].join("\r\n"));
});

test("resultToCsv keeps negative numbers", () => {
  assert.equal(resultToCsv(["n"], [[-5]]), "n\r\n-5");
});

test("isReadOnlySql", () => {
  assert.equal(isReadOnlySql("SELECT 1"), true);
  assert.equal(isReadOnlySql("  -- note\n with x as (select 1) select * from x"), true);
  assert.equal(isReadOnlySql("/* c */ explain select 1"), true);
  assert.equal(isReadOnlySql("DELETE FROM users"), false);
  assert.equal(isReadOnlySql("update t set a=1"), false);
  assert.equal(isReadOnlySql("selection"), false);
});

test("pushHistory is newest first, unique and capped", () => {
  assert.deepEqual(pushHistory(["b", "a"], "a"), ["a", "b"]);
  assert.deepEqual(pushHistory(["a"], "  "), ["a"]);
  assert.deepEqual(pushHistory(["a", "b", "c"], "d", 3), ["d", "a", "b"]);
});
