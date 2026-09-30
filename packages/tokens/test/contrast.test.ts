import { describe, expect, it } from "vitest";
import { brands, contrast, luminance, themes, type ThemeName } from "../src";

/** sRGB blend of `top` at `alpha` over `base` (close enough to oklab for contrast checks at these alphas). */
function mix(top: string, base: string, alpha: number): string {
  const ch = (h: string, i: number) => parseInt(h.replace("#", "").slice(i, i + 2), 16);
  const out = [0, 2, 4].map((i) => Math.round(ch(top, i) * alpha + ch(base, i) * (1 - alpha)));
  return `#${out.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Hue angle in degrees (HSL), for telling status hues apart from brand colours. */
function hue(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
function hueDistance(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
}

const TEXT = 4.5;
const UI = 3;
const modes: ThemeName[] = ["light", "dark"];

/**
 * Upstream brand actions that miss 4.5:1 for normal text. Values are quoted from product code and are
 * not Nasaq's to change; they still must clear 3:1 (large text / UI). Open decision B15 (BRAND-AUDIT §7).
 */
const KNOWN_ACTION_EXCEPTIONS = new Set(["health-debug:dark", "circlexo:light"]);

describe("semantic contrast", () => {
  for (const mode of modes) {
    const t = themes[mode];
    const grounds = {
      bg: t.bg,
      surface: t.surface,
      "surface-raised": t["surface-raised"],
      "surface-overlay": t["surface-overlay"],
      "surface-soft": t["surface-soft"],
      // hover/selected are fg overlays (build.mjs); text must still read on them over a surface.
      "selected on surface": mix(t.fg, t.surface, mode === "light" ? 0.08 : 0.1),
    };
    for (const [name, ground] of Object.entries(grounds)) {
      it(`${mode}: fg / fg-body on ${name} ≥ ${TEXT}`, () => {
        expect(contrast(t.fg, ground)).toBeGreaterThanOrEqual(TEXT);
        expect(contrast(t["fg-body"], ground)).toBeGreaterThanOrEqual(TEXT);
      });
      it(`${mode}: status text on ${name} ≥ ${TEXT}`, () => {
        for (const k of ["success-text", "warning-text", "danger-text", "info-text"] as const) expect(contrast(t[k], ground), k).toBeGreaterThanOrEqual(TEXT);
      });
    }
    it(`${mode}: fg-muted on bg ≥ ${TEXT}`, () => expect(contrast(t["fg-muted"], t.bg)).toBeGreaterThanOrEqual(TEXT));
    it(`${mode}: on-danger / danger-solid ≥ ${TEXT}`, () => expect(contrast(t["on-danger"], t["danger-solid"])).toBeGreaterThanOrEqual(TEXT));
    it(`${mode}: surfaces step up in luminance (dark) or down in tint (light), each distinct`, () => {
      const ladder = [t.bg, t.surface, t["surface-raised"], t["surface-overlay"]];
      for (let i = 1; i < ladder.length; i++) expect(ladder[i], `step ${i}`).not.toBe(ladder[i - 1]);
      if (mode === "dark") for (let i = 1; i < ladder.length; i++) expect(luminance(ladder[i]!)).toBeGreaterThan(luminance(ladder[i - 1]!));
      else for (let i = 1; i < ladder.length; i++) expect(luminance(ladder[i]!)).toBeGreaterThan(luminance(ladder[i - 1]!));
    });
    it(`${mode}: status hues are distinct from the gold accent`, () => {
      expect(hueDistance(t.warning, t.accent)).toBeGreaterThan(8);
    });
    it(`${mode}: focus ring on bg ≥ ${UI}`, () => expect(contrast(t.focus, t.bg)).toBeGreaterThanOrEqual(UI));
  }
});

describe("brand action contrast", () => {
  for (const [key, b] of Object.entries(brands)) {
    for (const mode of modes) {
      const min = KNOWN_ACTION_EXCEPTIONS.has(`${key}:${mode}`) ? UI : TEXT;
      it(`${key} ${mode}: on-action / action ≥ ${min}`, () => {
        expect(contrast(b.onAction[mode], b.action[mode])).toBeGreaterThanOrEqual(min);
      });
    }
  }
});

/**
 * Brand actions whose hue sits on a status hue. Allowed (brands are not Nasaq's to recolour), but
 * listed so it stays a known decision: in these brands a status must carry its label/icon, never
 * colour alone, and destructive buttons must say what they do. See docs/foundations/COLOR.md.
 */
const KNOWN_STATUS_COLLISIONS = new Set([
  "health-debug:danger", // action is Health Debug red
  "circlexo:info", // CircleXO sky blue
  "hosbah:info", // Hosbah steel blue
  "fadymondy:warning", // warm orange action vs amber warning
  "seatfor:warning", // orange action
  "orchestra:warning", // terracotta action
]);

describe("brand action vs status hues", () => {
  const statuses = ["success", "warning", "danger", "info"] as const;
  for (const [key, b] of Object.entries(brands)) {
    for (const st of statuses) {
      const collides = hueDistance(b.action.light, themes.light[st]) < 25 && luminance(b.action.light) < 0.9;
      it(`${key}: action vs ${st} ${collides ? "collides (must be listed)" : "distinct"}`, () => {
        // Both directions: an unlisted collision fails, and so does a stale entry that no longer collides.
        expect(KNOWN_STATUS_COLLISIONS.has(`${key}:${st}`), `${key}:${st} ${collides ? "is unlisted" : "is listed but distinct"}`).toBe(collides);
      });
    }
  }
});
