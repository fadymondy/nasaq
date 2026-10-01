import assert from "node:assert/strict";
import test from "node:test";
import { formatE164, formatNational, isValidE164, parsePhone, PHONE_COUNTRIES, phoneCountryName, phoneExample } from "../src/components/phone-input/phone-data.ts";

const byIso = (iso) => PHONE_COUNTRIES.find((c) => c.iso === iso);

test("every country has a calling code and an English and Arabic name", () => {
  assert.ok(PHONE_COUNTRIES.length > 230);
  const sa = byIso("SA");
  assert.deepEqual(sa, { iso: "SA", dial: "966", en: "Saudi Arabia", ar: "المملكة العربية السعودية" });
  assert.equal(byIso("PS").en, "Palestine");
  assert.equal(byIso("PS").ar, "فلسطين");
  assert.equal(phoneCountryName("eg", "ar"), "مصر");
  for (const c of PHONE_COUNTRIES) assert.match(c.dial, /^\d{1,3}$/, c.iso);
});

test("parsePhone places shared calling codes by number range", () => {
  assert.equal(parsePhone("+966501234567").country.iso, "SA");
  assert.equal(parsePhone("+966501234567").national, "501234567");
  assert.equal(parsePhone("+14165550123").country.iso, "CA");
  assert.equal(parsePhone("+12025550123").country.iso, "US");
  assert.equal(parsePhone("+1").country.iso, "US");
  assert.equal(parsePhone("+7").country.iso, "RU");
  assert.equal(parsePhone("0501234567"), null);
});

test("formatE164 drops the trunk 0, and Italy keeps its leading 0", () => {
  assert.equal(formatE164(byIso("SA"), "0501234567"), "+966501234567");
  assert.equal(formatE164(byIso("EG"), "01001234567"), "+201001234567");
  assert.equal(formatE164(byIso("IT"), "0612345678"), "+390612345678");
  assert.equal(formatE164(byIso("SA"), ""), "");
});

test("national numbers are grouped as written in the country", () => {
  assert.equal(formatNational(byIso("SA"), "501234567"), "50 123 4567");
  assert.match(phoneExample(byIso("SA")), /^5\d \d{3} \d{4}$/);
  assert.equal(formatNational(byIso("US"), "4165550123"), "416 555 0123");
  assert.equal(isValidE164("+966501234567"), true);
  assert.equal(isValidE164("+96650123"), false);
});

test("Arabic-Indic and Persian digits are read as 0-9", () => {
  assert.equal(formatNational(byIso("SA"), "٥٠١٢٣٤٥٦٧"), "50 123 4567");
  assert.equal(formatE164(byIso("IR"), "۰۹۱۲۳۴۵۶۷۸۹"), "+989123456789");
  assert.equal(parsePhone("+٩٦٦٥٠١٢٣٤٥٦٧").country.iso, "SA");
  assert.equal(formatE164(byIso("SA"), "٠٥٠١٢٣٤٥٦٧"), "+966501234567");
});
