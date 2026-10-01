import { describe, expect, it } from "vitest";
import { contrast, customBrandCssVars, darkVariant, normalizeHex, readableOn, resolveCustomBrandColors, type ResolvedCustomBrandColors } from "../src";

const BASE: ResolvedCustomBrandColors = {
  brand: { light: "#111111", dark: "#EEEEEE" },
  action: { light: "#222222", dark: "#DDDDDD" },
  onAction: { light: "#FFFFFF", dark: "#000000" },
  accent: "#ABCDEF",
};

describe("custom brand colours", () => {
  it("normalizes hex", () => {
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    expect(normalizeHex("c8283a")).toBe("#C8283A");
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex(undefined)).toBeNull();
  });
  it("returns the base for empty or invalid input", () => {
    expect(resolveCustomBrandColors(undefined, BASE)).toEqual(BASE);
    expect(resolveCustomBrandColors({ brand: "nope", accent: "x" }, BASE)).toEqual(BASE);
  });
  it("derives action, dark steps and on-colours from one brand colour", () => {
    const r = resolveCustomBrandColors({ brand: "#C8283A" }, BASE);
    expect(r.brand.light).toBe("#C8283A");
    expect(r.action).toEqual(r.brand);
    expect(r.accent).toBe(BASE.accent);
    expect(contrast(r.onAction.light, r.action.light)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(r.onAction.dark, r.action.dark)).toBeGreaterThanOrEqual(4.5);
  });
  it("honours explicit pairs", () => {
    const r = resolveCustomBrandColors({ brand: { light: "#112233", dark: "#99AABB" }, action: "#005500", onAction: "#FFF", accent: "#FF0" }, BASE);
    expect(r.brand.dark).toBe("#99AABB");
    expect(r.action.light).toBe("#005500");
    expect(r.onAction).toEqual({ light: "#FFFFFF", dark: "#FFFFFF" });
    expect(r.accent).toBe("#FFFF00");
  });
  it("lifts dark variants only when they are too dark", () => {
    expect(darkVariant("#FFFFFF")).toBe("#FFFFFF");
    const lifted = darkVariant("#102040");
    expect(contrast(lifted, "#101010")).toBeGreaterThan(contrast("#102040", "#101010"));
  });
  it("picks a readable foreground", () => {
    expect(contrast(readableOn("#FFFFFF"), "#FFFFFF")).toBeGreaterThan(7);
    expect(contrast(readableOn("#0E1A3C"), "#0E1A3C")).toBeGreaterThan(7);
  });
  it("emits the seven variables", () => {
    expect(Object.keys(customBrandCssVars(BASE))).toHaveLength(7);
  });
});
