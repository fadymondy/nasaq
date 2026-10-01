import { contrast } from "./contrast";
import { color } from "./generated/tokens";

/*
 * Client-brand colours: an app that is not a Nasaq brand themes Nasaq with its own colours, without
 * registering a brand. Pure and dependency-free, so web, native and tests share one resolution.
 * Derived roles (--nq-brand, --nq-action, --nq-on-action, --nq-primary-action) resolve from these exactly as
 * they do for a registered brand: the provider only writes the seven raw values below.
 */

export interface CustomPair {
  light: string;
  dark: string;
}

export interface CustomBrandColors {
  /** Identity colour. A single "#RRGGBB" is used on light surfaces and lifted for dark ones. */
  brand?: string | { light: string; dark?: string };
  /** Primary action fill. Defaults to `brand`. */
  action?: string | { light: string; dark?: string };
  /** Text on the action fill. Default: whichever of ivory or ink reads better. */
  onAction?: string | { light: string; dark?: string };
  /** Accent ("featured", "new"). Default: the base brand's accent. */
  accent?: string;
}

export interface ResolvedCustomBrandColors {
  brand: CustomPair;
  action: CustomPair;
  onAction: CustomPair;
  accent: string;
}

/** The CSS variables the brand scopes read; the provider writes exactly these. */
export const CUSTOM_BRAND_VARS = [
  "--nq-brand-l",
  "--nq-brand-d",
  "--nq-action-l",
  "--nq-action-d",
  "--nq-on-action-l",
  "--nq-on-action-d",
  "--nq-accent-brand",
] as const;

const ON_LIGHT = color.ink["900"];
const ON_DARK = color.ivory["200"];

/** "#RGB" or "#RRGGBB" (any case, "#" optional) to upper-case "#RRGGBB"; null when it is not a hex colour. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(v)) return `#${v.split("").map((c) => c + c).join("")}`.toUpperCase();
  return /^[0-9a-f]{6}$/i.test(v) ? `#${v}`.toUpperCase() : null;
}

function toHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function fromHsl(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round((lig - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** A lighter step of `hex` for dark surfaces: same hue, saturation capped at 70%, lightness at least 62%. */
export function darkVariant(hex: string): string {
  const { h, s, l } = toHsl(hex);
  return l >= 62 ? hex : fromHsl(h, Math.min(s, 70), 62);
}

/** Ivory or ink, whichever has the higher contrast on `background`. */
export function readableOn(background: string): string {
  return contrast(background, ON_LIGHT) >= contrast(background, ON_DARK) ? ON_LIGHT : ON_DARK;
}

function pair(input: string | { light: string; dark?: string } | undefined): { light: string; dark: string | null } | null {
  if (input === undefined) return null;
  const light = normalizeHex(typeof input === "string" ? input : input.light);
  if (!light) return null;
  const dark = typeof input === "string" ? null : normalizeHex(input.dark);
  return { light, dark };
}

/**
 * Fills every role of a brand from partial input over `base` (a registered brand's colours, usually nasaq).
 * Invalid values are skipped, so a bad colour from a database falls back instead of breaking the theme.
 * A role given only for light gets a lifted dark step; `onAction` is chosen for contrast when not given.
 */
export function resolveCustomBrandColors(input: CustomBrandColors | undefined, base: ResolvedCustomBrandColors): ResolvedCustomBrandColors {
  const brandIn = pair(input?.brand);
  const brand: CustomPair = brandIn ? { light: brandIn.light, dark: brandIn.dark ?? darkVariant(brandIn.light) } : base.brand;
  const actionIn = pair(input?.action);
  const action: CustomPair = actionIn
    ? { light: actionIn.light, dark: actionIn.dark ?? darkVariant(actionIn.light) }
    : brandIn
      ? brand
      : base.action;
  const onIn = pair(input?.onAction);
  const onAction: CustomPair = onIn
    ? { light: onIn.light, dark: onIn.dark ?? onIn.light }
    : actionIn || brandIn
      ? { light: readableOn(action.light), dark: readableOn(action.dark) }
      : base.onAction;
  return { brand, action, onAction, accent: normalizeHex(input?.accent) ?? base.accent };
}

/** The seven raw CSS custom properties for resolved colours. */
export function customBrandCssVars(c: ResolvedCustomBrandColors): Record<(typeof CUSTOM_BRAND_VARS)[number], string> {
  return {
    "--nq-brand-l": c.brand.light,
    "--nq-brand-d": c.brand.dark,
    "--nq-action-l": c.action.light,
    "--nq-action-d": c.action.dark,
    "--nq-on-action-l": c.onAction.light,
    "--nq-on-action-d": c.onAction.dark,
    "--nq-accent-brand": c.accent,
  };
}
