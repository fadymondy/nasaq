// Runtime tenant colours: the React branding-provider's helpers, for the Alpine side (see branding-provider.ts). The Blade
// component computes the same values in PHP for the server-rendered <style>.

/** Ivory and indigo: the two "on brand" text colours every Nasaq brand uses (ink 900, ivory 200). */
const ON_LIGHT = "#0E1A3C";
const ON_DARK = "#F0EBE1";

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** "#RRGGBB" (upper case) from "#RGB", "RRGGBB" or "#RRGGBB"; null when it is not a hex colour. */
export function normalizeHex(value: string): string | null {
  const text = value.trim();
  const withHash = text.startsWith("#") ? text : `#${text}`;
  if (!HEX_RE.test(withHash)) return null;
  const digits = withHash.slice(1).toUpperCase();
  return `#${digits.length === 3 ? [...digits].map((c) => c + c).join("") : digits}`;
}

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

/** "#RRGGBB" to `{ h, s, l }` (degrees and percent, rounded). Null when the value is not a hex colour. */
export function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** `{ h, s, l }` back to "#RRGGBB". */
export function hslToHex({ h, s, l }: { h: number; s: number; l: number }): string {
  const sat = s / 100;
  const lig = l / 100;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = lig - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** Ivory or indigo, whichever reads better on `background`. */
export function readableOn(background: string): string {
  return contrast(background, ON_LIGHT) >= contrast(background, ON_DARK) ? ON_LIGHT : ON_DARK;
}

/** A lighter step of `hex` for dark surfaces: same hue, lightness raised to at least 62%. */
export function darkVariant(hex: string): string | null {
  const hsl = hexToHSL(hex);
  if (!hsl) return null;
  return hslToHex({ h: hsl.h, s: Math.min(hsl.s, 70), l: Math.max(hsl.l, 62) });
}

export interface BrandColors {
  brand?: string;
  brandDark?: string;
  action?: string;
  actionDark?: string;
  accent?: string;
}

const VARS = ["--nq-brand-l", "--nq-brand-d", "--nq-action-l", "--nq-action-d", "--nq-on-action-l", "--nq-on-action-d", "--nq-accent-brand"] as const;

/**
 * Writes the brand variables onto `root` as inline styles, over the active brand manifest. Invalid colours are skipped,
 * so a bad value from a database falls back to the manifest. Returns a function that removes what it wrote.
 */
export function applyBrand(root: HTMLElement, colors: BrandColors): () => void {
  const brand = colors.brand ? normalizeHex(colors.brand) : null;
  const brandDark = (colors.brandDark && normalizeHex(colors.brandDark)) || (brand ? darkVariant(brand) : null);
  const action = (colors.action && normalizeHex(colors.action)) || brand;
  const actionDark = (colors.actionDark && normalizeHex(colors.actionDark)) || brandDark;
  const accent = colors.accent ? normalizeHex(colors.accent) : null;
  const values: Record<(typeof VARS)[number], string | null> = {
    "--nq-brand-l": brand,
    "--nq-brand-d": brandDark,
    "--nq-action-l": action,
    "--nq-action-d": actionDark,
    "--nq-on-action-l": action ? readableOn(action) : null,
    "--nq-on-action-d": actionDark ? readableOn(actionDark) : null,
    "--nq-accent-brand": accent,
  };
  const written: string[] = [];
  // The derived roles re-resolve only on :root and [data-brand], so a scoped target needs the attribute.
  const scoped = root !== root.ownerDocument.documentElement && !root.hasAttribute("data-brand");
  if (scoped) root.setAttribute("data-brand", "runtime");
  for (const name of VARS) {
    const value = values[name];
    if (value) {
      root.style.setProperty(name, value);
      written.push(name);
    }
  }
  return () => {
    for (const name of written) root.style.removeProperty(name);
    if (scoped) root.removeAttribute("data-brand");
  };
}
