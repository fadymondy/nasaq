import assert from "node:assert/strict";
import { test } from "node:test";
import { badgeCountLabel, offerAmountDue, parseSchemePreference, schemeFromPreference } from "../src/logic.ts";
import { resolveTheme } from "../src/theme.ts";

test("scheme preference parses unknown values as system", () => {
  assert.equal(parseSchemePreference("dark"), "dark");
  assert.equal(parseSchemePreference("light"), "light");
  assert.equal(parseSchemePreference("sepia"), "system");
  assert.equal(parseSchemePreference(null), "system");
  assert.equal(schemeFromPreference("system"), undefined);
  assert.equal(schemeFromPreference("dark"), "dark");
});

test("offerAmountDue adds the delivery fee to the order total", () => {
  assert.equal(offerAmountDue(8500, 1500), 10000);
  assert.equal(offerAmountDue(-5, 1500), 1500);
});

test("badgeCountLabel hides zero and caps large counts", () => {
  assert.equal(badgeCountLabel(0), "");
  assert.equal(badgeCountLabel(7), "7");
  assert.equal(badgeCountLabel(120), "99+");
  assert.equal(badgeCountLabel(3, 99, true), "٣");
});

test("resolveTheme applies client brand colours and derives on-colours", () => {
  const light = resolveTheme({ brandColors: { brand: "#C8283A" }, scheme: "light" });
  assert.equal(light.colors.action, "#C8283A");
  assert.equal(light.colors.brand, "#C8283A");
  const dark = resolveTheme({ brandColors: { brand: "#C8283A" }, scheme: "dark" });
  assert.notEqual(dark.colors.action, "#C8283A");
  assert.match(dark.colors.onAction, /^#[0-9A-F]{6}$/);
  const plain = resolveTheme({ scheme: "light" });
  assert.notEqual(plain.colors.action, "#C8283A");
});

test("a custom brand object keeps its own name and falls back for the rest", () => {
  const t = resolveTheme({ brand: { name: { en: "Acme" }, color: { action: "#0055FF" } } });
  assert.equal(t.brand.name.en, "Acme");
  assert.equal(t.colors.action, "#0055FF");
  assert.ok(t.brand.mark);
});
