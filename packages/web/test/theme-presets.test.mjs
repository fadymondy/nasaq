import assert from "node:assert/strict";
import { test } from "node:test";
import { THEME_PRESETS, textOn, themePresetSwatches, themePresetVars, toHex } from "../src/components/theme-presets/theme-presets-logic.ts";

const byId = (id) => THEME_PRESETS.find((p) => p.id === id);

test("every family comes as dark and light", () => {
  assert.equal(THEME_PRESETS.length, 8);
  assert.equal(byId("rose").mode, "dark");
  assert.equal(byId("rose-light").mode, "light");
  assert.equal(new Set(THEME_PRESETS.map((p) => p.id)).size, 8);
});

test("toHex normalises and rejects", () => {
  assert.equal(toHex("#abc"), "#AABBCC");
  assert.equal(toHex("7c3aed"), "#7C3AED");
  assert.equal(toHex("red"), undefined);
  assert.equal(toHex(undefined), undefined);
});

test("the Nasaq preset keeps the manifest", () => {
  assert.deepEqual(themePresetVars(byId("nasaq")), {});
  assert.equal(themePresetSwatches(byId("nasaq"))[3], "var(--nq-brand-d)");
});

test("a preset sets brand, action and readable text", () => {
  const vars = themePresetVars(byId("purple"));
  assert.equal(vars["--nq-brand-l"], "#7C3AED");
  assert.equal(vars["--nq-brand-d"], "#9B6DF5");
  assert.equal(vars["--nq-action-l"], "#7C3AED");
  assert.equal(vars["--nq-accent-brand"], "#C9A227");
  assert.equal(vars["--nq-on-action-l"], textOn("#7C3AED"));
});

test("overrides win, and a brand override also drives dark", () => {
  const vars = themePresetVars(byId("emerald"), { brand: "#123456", accent: "not-a-colour" });
  assert.equal(vars["--nq-brand-l"], "#123456");
  assert.equal(vars["--nq-brand-d"], "#123456");
  assert.equal(vars["--nq-accent-brand"], "#C9A227");
  const both = themePresetVars(byId("emerald"), { brand: "#123456", brandDark: "#ABCDEF" });
  assert.equal(both["--nq-brand-d"], "#ABCDEF");
});

test("textOn picks the readable ink", () => {
  assert.notEqual(textOn("#FFFFFF"), textOn("#000000"));
});
