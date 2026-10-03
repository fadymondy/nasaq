// The React theme-presets-logic. @nasaq/tokens is not a dependency of this package, so the palette steps this uses
// (ink 900/950, ivory 100/200, gold 500) and the WCAG contrast maths are inlined, as in branding-provider.

/** A named theme: light or dark plus brand colours. With no colours it is the active brand manifest as shipped. */
export interface ThemePreset {
  id: string;
  label: string;
  /** Arabic label, used when the Nasaq locale is Arabic. */
  labelAr?: string;
  mode: "light" | "dark";
  /** Brand colour for light surfaces, "#RRGGBB". Omit to keep the manifest's. */
  brand?: string;
  /** Brand colour for dark surfaces. Default: `brand`. */
  brandDark?: string;
  /** Accent (featured / new). Omit to keep the manifest's. */
  accent?: string;
}

/** Colours that win over the chosen preset, e.g. a tenant's own brand colour. */
export interface ThemeOverrides {
  brand?: string;
  brandDark?: string;
  accent?: string;
}

const INK_900 = "#0E1A3C";
const INK_950 = "#0B1429";
const IVORY_100 = "#F7F4EC";
const IVORY_200 = "#F0EBE1";
const GOLD_500 = "#C9A227";

function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const channel = (i: number) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** The colour families from the ToGO theme set: each comes as a dark and a light preset. */
const FAMILIES = [
  { id: "nasaq", label: "Nasaq", labelAr: "نسق" },
  { id: "purple", label: "Purple", labelAr: "بنفسجي", brand: "#7C3AED", brandDark: "#9B6DF5", accent: GOLD_500 },
  { id: "rose", label: "Rose", labelAr: "وردي", brand: "#E11D48", brandDark: "#F5427B", accent: "#1F8A99" },
  { id: "emerald", label: "Emerald", labelAr: "زمردي", brand: "#059669", brandDark: "#10B981", accent: GOLD_500 },
] as const;

/** Eight presets: every family in dark (`purple`) and light (`purple-light`). */
export const THEME_PRESETS: readonly ThemePreset[] = FAMILIES.flatMap(({ id, label, labelAr, ...colors }) => [
  { id, label, labelAr, mode: "dark" as const, ...colors },
  { id: `${id}-light`, label: `${label} light`, labelAr: `${labelAr} فاتح`, mode: "light" as const, ...colors },
]);

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A 3- or 6-digit hex colour, with or without `#`, as uppercase `#RRGGBB`; `undefined` for anything else. */
export function themeToHex(value: string | null | undefined): string | undefined {
  const m = value?.trim().match(HEX);
  if (!m) return undefined;
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join("") : m[1]!;
  return `#${h.toUpperCase()}`;
}

/** Ink or ivory, whichever reads better on `background`. */
export function themeTextOn(background: string): string {
  return contrast(background, INK_900) >= contrast(background, IVORY_200) ? INK_900 : IVORY_200;
}

/**
 * The brand variables a preset (plus overrides) sets: `--nq-brand-l/-d`, `--nq-action-l/-d`, the text on the action
 * fill, and `--nq-accent-brand`. Invalid colours are dropped, so a bad stored value falls back to the manifest.
 */
export function themePresetVars(preset: ThemePreset, overrides: ThemeOverrides = {}): Record<string, string> {
  const brand = themeToHex(overrides.brand) ?? themeToHex(preset.brand);
  const brandDark = themeToHex(overrides.brandDark) ?? (overrides.brand ? brand : undefined) ?? themeToHex(preset.brandDark) ?? brand;
  const accent = themeToHex(overrides.accent) ?? themeToHex(preset.accent);
  const vars: Record<string, string> = {};
  if (brand) Object.assign(vars, { "--nq-brand-l": brand, "--nq-action-l": brand, "--nq-on-action-l": themeTextOn(brand) });
  if (brandDark) Object.assign(vars, { "--nq-brand-d": brandDark, "--nq-action-d": brandDark, "--nq-on-action-d": themeTextOn(brandDark) });
  if (accent) vars["--nq-accent-brand"] = accent;
  return vars;
}

/** Page, surface, text and accent colours for the preset's gallery preview. */
export function themePresetSwatches(preset: ThemePreset, overrides: ThemeOverrides = {}): string[] {
  const vars = themePresetVars(preset, overrides);
  const dark = preset.mode === "dark";
  const brand = (dark ? vars["--nq-brand-d"] : vars["--nq-brand-l"]) ?? (dark ? "var(--nq-brand-d)" : "var(--nq-brand-l)");
  return dark ? [INK_950, INK_900, IVORY_200, brand] : [IVORY_200, IVORY_100, INK_900, brand];
}
