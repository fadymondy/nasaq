import assert from "node:assert/strict";
import { test } from "node:test";
import { brandColorCopyValue, markDownloadItems, ogSizeLabel, paletteFromManifest, svgDataUri } from "../src/components/brand-guidelines/brand-guidelines-logic.ts";

const color = { brand: { light: "#111111", dark: "#222222" }, action: { light: "#333333", dark: "#444444" }, onAction: { light: "#555555", dark: "#666666" }, accent: "#777777" };

test("palette keeps the manifest order and values untouched", () => {
  const p = paletteFromManifest(color);
  assert.deepEqual(p.map((c) => c.id), ["brand-light", "brand-dark", "action-light", "action-dark", "accent"]);
  assert.deepEqual(p.map((c) => c.value), ["#111111", "#222222", "#333333", "#444444", "#777777"]);
  assert.equal(p[2].onColor, "#555555");
  assert.equal(p[0].onColor, undefined);
});

test("downloads pass the SVG through unchanged", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#15694A"/></svg>';
  const [light, dark] = markDownloadItems("nasaq", { light: svg, dark: "<svg/>" }, { light: "L", dark: "D" });
  assert.equal(decodeURIComponent(light.href.split(",")[1]), svg);
  assert.equal(light.filename, "nasaq-mark.svg");
  assert.equal(dark.filename, "nasaq-mark-on-dark.svg");
  assert.equal(dark.ground, "dark");
  assert.ok(svgDataUri("<svg/>").startsWith("data:image/svg+xml"));
});

test("copy value and og size", () => {
  assert.equal(brandColorCopyValue({ id: "x", value: " #15694A " }), "#15694A");
  assert.equal(ogSizeLabel(undefined), "1200 × 630");
  assert.equal(ogSizeLabel([1600, 900]), "1600 × 900");
  assert.equal(ogSizeLabel("1:1"), "1:1");
});
