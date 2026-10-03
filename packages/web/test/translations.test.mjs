import assert from "node:assert/strict";
import { test } from "node:test";
import { createTranslator, interpolate, localeChain, lookup } from "../src/components/translations/translations-logic.ts";

const bundle = {
  en: {
    greeting: "Hello, {name}!",
    "flat.key": "Flat wins",
    flat: { key: "Nested loses" },
    nav: { home: "Home", settings: { title: "Settings" } },
    items_zero: "No items",
    items_one: "{count} item",
    items_other: "{count} items",
    onlyEn: "English only",
  },
  ar: {
    greeting: "مرحبًا، {{ name }}!",
    nav: { home: "الرئيسية" },
    items_zero: "لا عناصر",
    items_one: "عنصر واحد",
    items_two: "عنصران",
    items_few: "{count} عناصر",
    items_many: "{count} عنصرًا",
    items_other: "{count} عنصر",
  },
};

test("lookup reads nested, flat and namespaced keys", () => {
  assert.equal(lookup(bundle.en, "nav.settings.title"), "Settings");
  assert.equal(lookup(bundle.en, "nav:home"), "Home");
  assert.equal(lookup(bundle.en, "flat.key"), "Flat wins");
  assert.equal(lookup(bundle.en, "nav"), undefined);
  assert.equal(lookup(bundle.en, "nav.home.deeper"), undefined);
  assert.equal(lookup(undefined, "x"), undefined);
});

test("interpolate fills both brace styles and keeps unknown names", () => {
  assert.equal(interpolate("{a} and {{ b }} and {c}", { a: "1", b: "2" }), "1 and 2 and {c}");
  assert.equal(interpolate("{n}", { n: 1234 }, "en"), "1,234");
});

test("localeChain dedupes regions and fallbacks", () => {
  assert.deepEqual(localeChain("ar-EG", "en"), ["ar-EG", "ar", "en"]);
  assert.deepEqual(localeChain("en", "en"), ["en"]);
});

test("translator falls back by locale, then default, then key", () => {
  const t = createTranslator(bundle, "ar-EG");
  assert.equal(t("nav.home"), "الرئيسية");
  assert.equal(t("onlyEn"), "English only");
  assert.equal(t("missing", { defaultValue: "Default {x}", x: "ok" }), "Default ok");
  assert.equal(t("missing.key"), "missing.key");
  assert.equal(t("greeting", { name: "Layla" }), "مرحبًا، Layla!");
});

test("plurals use the CLDR form for each locale", () => {
  const en = createTranslator(bundle, "en");
  assert.equal(en("items", { count: 0 }), "No items");
  assert.equal(en("items", { count: 1 }), "1 item");
  assert.equal(en("items", { count: 5 }), "5 items");
  const ar = createTranslator(bundle, "ar");
  const n = (x) => new Intl.NumberFormat("ar").format(x);
  assert.equal(ar("items", { count: 0 }), "لا عناصر");
  assert.equal(ar("items", { count: 1 }), "عنصر واحد");
  assert.equal(ar("items", { count: 2 }), "عنصران");
  assert.equal(ar("items", { count: 3 }), `${n(3)} عناصر`);
  assert.equal(ar("items", { count: 11 }), `${n(11)} عنصرًا`);
  assert.equal(ar("items", { count: 100 }), `${n(100)} عنصر`);
});
