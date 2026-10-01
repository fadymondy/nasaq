import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const components = read("../src/components.css");
const base = read("../src/base.css");
const tokens = read("../../tokens/dist/tokens.css");

describe("css layer", () => {
  it("keeps every component rule inside @layer components, so host utilities win", () => {
    const outside = components.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@layer components\s*\{[\s\S]*\}\s*$/, "").trim();
    expect(outside).toBe("");
    expect(base).toMatch(/@layer theme, base, components, utilities;/);
  });

  it("colours only from tokens, never hard-coded hex", () => {
    expect(components.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("uses only --nq-* tokens that exist", () => {
    const used = new Set(Array.from(components.matchAll(/var\((--nq-[\w-]+)/g), (m) => m[1]!));
    const missing = [...used].filter((t) => !tokens.includes(`${t}:`));
    expect(missing).toEqual([]);
  });
});
