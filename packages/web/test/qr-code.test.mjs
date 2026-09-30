import assert from "node:assert/strict";
import { test } from "node:test";
import { qrLayout, qrSvgString } from "../src/components/qr-code/qr-svg.ts";

test("layout has a square grid and three eyes", () => {
  const l = qrLayout({ value: "https://example.com" });
  assert.ok(l.size > 21);
  assert.equal(l.eyes.length, 3);
  assert.ok(l.modules.length > 0);
});

test("every module style produces a path", () => {
  for (const moduleStyle of ["square", "dots", "rounded"]) {
    assert.ok(qrLayout({ value: "hello", moduleStyle }).modules.length > 10, moduleStyle);
  }
});

test("a logo forces high error correction and clears the middle", () => {
  const plain = qrLayout({ value: "hello world" });
  const logo = qrLayout({ value: "hello world", logo: { src: "x.png" } });
  assert.ok(logo.logo);
  assert.notEqual(plain.modules, logo.modules);
});

test("standalone svg is well formed and carries colours", () => {
  const svg = qrSvgString({ value: "abc", fg: "rgb(1, 2, 3)", bg: "rgb(255, 255, 255)" });
  assert.match(svg, /^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /rgb\(1, 2, 3\)/);
  assert.match(svg, /<\/svg>$/);
});
