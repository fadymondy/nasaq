import { color, contrast } from "@nasaq/tokens";

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

/** The colour families from the ToGO theme set: each comes as a dark and a light preset. */
const FAMILIES = [
  { id: "nasaq", label: "Nasaq", labelAr: "نسق" },
  { id: "purple", label: "Purple", labelAr: "بنفسجي", brand: "#7C3AED", brandDark: "#9B6DF5", accent: color.gold["500"] }, // nasaq-lint-ignore: preset data
  { id: "rose", label: "Rose", labelAr: "وردي", brand: "#E11D48", brandDark: "#F5427B", accent: "#1F8A99" }, // nasaq-lint-ignore: preset data
  { id: "emerald", label: "Emerald", labelAr: "زمردي", brand: "#059669", brandDark: "#10B981", accent: color.gold["500"] }, // nasaq-lint-ignore: preset data
] as const;

/** Eight presets: every family in dark (`purple`) and light (`purple-light`). */
export const THEME_PRESETS: readonly ThemePreset[] = FAMILIES.flatMap(({ id, label, labelAr, ...colors }) => [
  { id, label, labelAr, mode: "dark" as const, ...colors },
  { id: `${id}-light`, label: `${label} light`, labelAr: `${labelAr} فاتح`, mode: "light" as const, ...colors },
]);

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A 3- or 6-digit hex colour, with or without `#`, as uppercase `#RRGGBB`; `undefined` for anything else. */
export function toHex(value: string | null | undefined): string | undefined {
  const m = value?.trim().match(HEX);
  if (!m) return undefined;
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join("") : m[1]!;
  return `#${h.toUpperCase()}`;
}

/** Ink or ivory, whichever reads better on `background`. */
export function textOn(background: string): string {
  const onLight = color.ink["900"];
  const onDark = color.ivory["200"];
  return contrast(background, onLight) >= contrast(background, onDark) ? onLight : onDark;
}

/**
 * The brand variables a preset (plus overrides) sets: `--nq-brand-l/-d`, `--nq-action-l/-d`, the text on the action
 * fill, and `--nq-accent-brand`. Invalid colours are dropped, so a bad stored value falls back to the manifest.
 */
export function themePresetVars(preset: ThemePreset, overrides: ThemeOverrides = {}): Record<string, string> {
  const brand = toHex(overrides.brand) ?? toHex(preset.brand);
  const brandDark = toHex(overrides.brandDark) ?? (overrides.brand ? brand : undefined) ?? toHex(preset.brandDark) ?? brand;
  const accent = toHex(overrides.accent) ?? toHex(preset.accent);
  const vars: Record<string, string> = {};
  if (brand) Object.assign(vars, { "--nq-brand-l": brand, "--nq-action-l": brand, "--nq-on-action-l": textOn(brand) });
  if (brandDark) Object.assign(vars, { "--nq-brand-d": brandDark, "--nq-action-d": brandDark, "--nq-on-action-d": textOn(brandDark) });
  if (accent) vars["--nq-accent-brand"] = accent;
  return vars;
}

/** Page, surface, text and accent colours for the preset's gallery preview. */
export function themePresetSwatches(preset: ThemePreset, overrides: ThemeOverrides = {}): string[] {
  const vars = themePresetVars(preset, overrides);
  const dark = preset.mode === "dark";
  const brand = (dark ? vars["--nq-brand-d"] : vars["--nq-brand-l"]) ?? (dark ? "var(--nq-brand-d)" : "var(--nq-brand-l)");
  return dark
    ? [color.ink["950"], color.ink["900"], color.ivory["200"], brand]
    : [color.ivory["200"], color.ivory["100"], color.ink["900"], brand];
}
