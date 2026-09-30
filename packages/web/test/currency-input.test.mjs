import assert from "node:assert/strict";
import { test } from "node:test";
import {
  convertMinorDecimals,
  currencyDecimals,
  currencySymbol,
  formatMinor,
  majorToMinor,
  minorToPlain,
  moneyInRange,
  normalizeMoneyDigits,
  parseMoney,
  sanitizeMoneyText,
  symbolSide,
  toPlainDecimal,
  withMoneyDigits,
} from "../src/components/currency-input/currency-input-logic.ts";

test("decimals follow the currency", () => {
  assert.equal(currencyDecimals("USD"), 2);
  assert.equal(currencyDecimals("sar"), 2);
  assert.equal(currencyDecimals("JPY"), 0);
  assert.equal(currencyDecimals("KWD"), 3);
  assert.equal(currencyDecimals("BHD"), 3);
  assert.equal(currencyDecimals("NOPE-ZZ"), 2);
});

test("Arabic-Indic and Persian digits normalise", () => {
  assert.equal(normalizeMoneyDigits("١٢٣٤٫٥٠"), "1234.50");
  assert.equal(normalizeMoneyDigits("۱۲۳"), "123");
  assert.equal(normalizeMoneyDigits("‏١٬٢٠٠‎"), "1,200");
  assert.equal(normalizeMoneyDigits("−٥"), "-5");
});

test("parses plain, grouped and Arabic amounts to the same minor units", () => {
  const usd = { currency: "USD" };
  assert.equal(parseMoney("1250.5", usd), 125050);
  assert.equal(parseMoney("١٢٥٠٫٥", usd), 125050);
  assert.equal(parseMoney("١٬٢٥٠٫٥٠", { ...usd, locale: "ar", paste: true }), 125050);
  assert.equal(parseMoney("SAR 1,250.50", { currency: "SAR", paste: true }), 125050);
  assert.equal(parseMoney("١٬٢٥٠٫٥٠ ر.س.‏", { currency: "SAR", locale: "ar", paste: true }), 125050);
  assert.equal(parseMoney("", usd), null);
  assert.equal(parseMoney("abc", usd), null);
});

test("no float drift: 19.99 is 1999, 0.1 + 0.2 style inputs stay exact", () => {
  assert.equal(parseMoney("19.99", { currency: "USD" }), 1999);
  assert.equal(parseMoney("0.29", { currency: "USD" }), 29);
  assert.equal(parseMoney("1.005", { currency: "USD" }), 101);
  assert.equal(majorToMinor(19.99, "USD"), 1999);
  assert.equal(majorToMinor(1.005, "USD"), 101);
  assert.equal(parseMoney("4503599627370.49", { currency: "USD" }), 450359962737049);
});

test("zero and three decimal currencies", () => {
  assert.equal(parseMoney("1200", { currency: "JPY" }), 1200);
  assert.equal(parseMoney("1200.6", { currency: "JPY" }), 1201);
  assert.equal(parseMoney("1200.6", { currency: "JPY", overflow: "truncate" }), 1200);
  assert.equal(parseMoney("1.234", { currency: "KWD" }), 1234);
  assert.equal(parseMoney("1.2", { currency: "KWD" }), 1200);
});

test("paste heuristics: a lone comma or dot", () => {
  const p = (text, locale = "en") => parseMoney(text, { currency: "USD", locale, paste: true });
  assert.equal(p("1,250"), 125000);
  assert.equal(p("1,5"), 150);
  assert.equal(p("1.250,75"), 125075);
  assert.equal(p("1,250.75"), 125075);
  assert.equal(p("1.250", "de"), 125000);
  assert.equal(p("1,25", "de"), 125);
  assert.equal(p("1,234,567.8"), 123456780);
});

test("negatives", () => {
  assert.equal(parseMoney("-12.5", { currency: "USD" }), -1250);
  assert.equal(parseMoney("(12.50)", { currency: "USD" }), -1250);
  assert.equal(parseMoney("−١٢٫٥", { currency: "USD" }), -1250);
  assert.equal(parseMoney("-0", { currency: "USD" }), 0);
});

test("typing keeps a trailing decimal mark and cuts extra decimals", () => {
  assert.equal(toPlainDecimal("12."), "12.");
  assert.equal(toPlainDecimal(".5"), "0.5");
  assert.equal(toPlainDecimal("007"), "7");
  assert.deepEqual(sanitizeMoneyText("12.345", 2), { plain: "12.34", minor: 1234 });
  assert.deepEqual(sanitizeMoneyText("12.9", 0), { plain: "12", minor: 12 });
  assert.deepEqual(sanitizeMoneyText("١٢٫٥", 2), { plain: "12.5", minor: 1250 });
  assert.deepEqual(sanitizeMoneyText("1,2", 2, { locale: "de" }), { plain: "1.2", minor: 120 });
  assert.deepEqual(sanitizeMoneyText("", 2), { plain: "", minor: null });
  assert.deepEqual(sanitizeMoneyText("-", 2, { allowNegative: true }), { plain: "-", minor: null });
  assert.deepEqual(sanitizeMoneyText("-", 2), { plain: "", minor: null });
  assert.deepEqual(sanitizeMoneyText("-5", 2, { allowNegative: true }), { plain: "-5", minor: -500 });
  assert.deepEqual(sanitizeMoneyText("-5", 2), { plain: "5", minor: 500 });
  assert.equal(sanitizeMoneyText("99999999999999999999", 2), null);
});

test("minor units to plain and back", () => {
  assert.equal(minorToPlain(1999, 2), "19.99");
  assert.equal(minorToPlain(5, 2), "0.05");
  assert.equal(minorToPlain(-1999, 2), "-19.99");
  assert.equal(minorToPlain(1200, 0), "1200");
  assert.equal(minorToPlain(1234, 3), "1.234");
});

test("formats en and ar, Western and Arabic digits", () => {
  assert.equal(formatMinor(125050, "USD", "en"), "1,250.50");
  assert.equal(formatMinor(125000, "USD", "en", { fixed: false }), "1,250");
  assert.equal(formatMinor(125050, "USD", "en", { fixed: false }), "1,250.50");
  assert.equal(formatMinor(1200, "JPY", "en"), "1,200");
  assert.equal(formatMinor(1234, "KWD", "en"), "1.234");
  assert.equal(formatMinor(125050, "SAR", "ar", { digits: "arab" }), "١٬٢٥٠٫٥٠");
  assert.match(formatMinor(125050, "SAR", "ar"), /^1.250.50$/);
  assert.equal(formatMinor(125050, "EUR", "de"), "1.250,50");
  assert.equal(formatMinor(99, "USD", "en", { grouping: false }), "0.99");
});

test("formatted text parses back to the same amount (round trip)", () => {
  for (const [minor, cur, loc, digits] of [
    [125050, "SAR", "ar", "arab"],
    [125050, "SAR", "ar", "latn"],
    [99, "USD", "en", "latn"],
    [1234567, "KWD", "en", "latn"],
    [125050, "EUR", "de", "latn"],
    [1200, "JPY", "ja", "latn"],
  ]) {
    assert.equal(parseMoney(formatMinor(minor, cur, loc, { digits }), { currency: cur, locale: loc, paste: true }), minor, `${minor} ${cur} ${loc} ${digits}`);
  }
});

test("digit set switching keeps length", () => {
  assert.equal(withMoneyDigits("12.5", "arab"), "١٢.٥");
  assert.equal(withMoneyDigits("12.5", "latn"), "12.5");
});

test("changing currency keeps the amount of money", () => {
  assert.equal(convertMinorDecimals(1250, "USD", "KWD"), 12500);
  assert.equal(convertMinorDecimals(1250, "USD", "JPY"), 13);
  assert.equal(convertMinorDecimals(1250, "USD", "SAR"), 1250);
});

test("symbol side and symbols", () => {
  assert.equal(symbolSide("USD", "en"), "start");
  assert.equal(symbolSide("SAR", "ar"), "end");
  assert.equal(currencySymbol("USD", "en"), "$");
  assert.equal(currencySymbol("SAR", "en", "code"), "SAR");
});

test("range check is inclusive and empty is fine", () => {
  assert.equal(moneyInRange(null, 100, 200), true);
  assert.equal(moneyInRange(100, 100, 200), true);
  assert.equal(moneyInRange(99, 100, 200), false);
  assert.equal(moneyInRange(201, 100, 200), false);
  assert.equal(moneyInRange(5, undefined, undefined), true);
});
