import assert from "node:assert/strict";
import { test } from "node:test";
import { gtinCheckDigit, validateBarcode } from "../src/components/barcode/barcode-format.ts";

test("gtin check digit", () => {
  assert.equal(gtinCheckDigit("400638133393"), 1);
  assert.equal(gtinCheckDigit("03600029145"), 2);
});

test("EAN-13 validation", () => {
  assert.equal(validateBarcode("EAN13", "4006381333931"), null);
  assert.ok(validateBarcode("EAN13", ""));
  assert.ok(validateBarcode("EAN13", "40063813339"));
  assert.ok(validateBarcode("EAN13", "4006381333932"));
  assert.ok(validateBarcode("EAN13", "40063813339ab"));
});

test("Code128 accepts text", () => {
  assert.equal(validateBarcode("CODE128", "Nasaq-2026"), null);
});
