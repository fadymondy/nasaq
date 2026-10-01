"use client";
import { createContext, type ReactNode, use, useEffect, useMemo } from "react";
import { color, contrast } from "@nasaq/tokens";
import { normalizeHexColor } from "../color-picker";

/* Runtime tenant colours. A brand manifest (`NasaqProvider brand="…"`) is the build-time way; this is for
   colours that arrive from a database: an org's settings, a white-label customer. */

/** Ivory and indigo: the two "on brand" text colours every Nasaq brand uses. */
const ON_LIGHT = color.ink["900"];
const ON_DARK = color.ivory["200"];

const normalizeHex = (value: string) => normalizeHexColor(value)?.toUpperCase() ?? null;

function toRgb(hex: string): [number, number, number] | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}

/** "#RRGGBB" to `{ h, s, l }` (degrees and percent, rounded). Null when the value is not a hex colour. */
export function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const rgb = toRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => v / 255) as [number, number, number];
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
  /** Brand colour on light surfaces, "#RRGGBB". */
  brand?: string;
  /** Brand colour on dark surfaces. Default: a lighter step of `brand`. */
  brandDark?: string;
  /** Primary-button fill. Default: the brand colour. */
  action?: string;
  actionDark?: string;
  /** Accent (featured / new). Default: the active brand manifest's accent. */
  accent?: string;
}

const VARS = ["--nq-brand-l", "--nq-brand-d", "--nq-action-l", "--nq-action-d", "--nq-on-action-l", "--nq-on-action-d", "--nq-accent-brand"] as const;

/**
 * Writes the brand variables onto `root` as inline styles, over the active brand manifest. Invalid colours
 * are skipped, so a bad value from a database falls back to the manifest instead of breaking the theme.
 * Returns a function that removes what it wrote.
 */
export function applyBrand(root: HTMLElement, colors: BrandColors): () => void {
  const brand = colors.brand ? normalizeHex(colors.brand) : null;
  const brandDark = (colors.brandDark && normalizeHex(colors.brandDark)) || (brand ? darkVariant(brand) : null);
  const action = (colors.action && normalizeHex(colors.action)) || brand;
  const actionDark = (colors.actionDark && normalizeHex(colors.actionDark)) || brandDark;
  const accent = colors.accent ? normalizeHex(colors.accent) : null;

  const values: Partial<Record<(typeof VARS)[number], string | null>> = {
    "--nq-brand-l": brand,
    "--nq-brand-d": brandDark,
    "--nq-action-l": action,
    "--nq-action-d": actionDark,
    "--nq-on-action-l": action ? readableOn(action) : null,
    "--nq-on-action-d": actionDark ? readableOn(actionDark) : null,
    "--nq-accent-brand": accent,
  };
  const written: string[] = [];
  // The derived roles (--nq-brand, --primary…) re-resolve only on :root and [data-brand], so a scoped target
  // needs the attribute to pick up the new colours.
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

export interface BrandingValue extends BrandColors {
  /** Tenant logo URL, or null when it has none (show the product mark instead). */
  logoUrl: string | null;
  /** Tenant or product display name. */
  name?: string;
}

const BrandingContext = createContext<BrandingValue | null>(null);

export interface BrandingProviderProps extends BrandColors {
  logoUrl?: string | null;
  name?: string;
  /** Where the variables are written. Default `document.documentElement`. */
  target?: () => HTMLElement | null;
  children: ReactNode;
}

/**
 * Applies a tenant's brand colours at runtime and shares the logo and name with the tree (`useBranding`).
 * Place it inside `NasaqProvider`. Renders no element; the server render uses the manifest colours.
 */
export function BrandingProvider({ brand, brandDark, action, actionDark, accent, logoUrl, name, target, children }: BrandingProviderProps) {
  useEffect(() => {
    const el = target ? target() : typeof document !== "undefined" ? document.documentElement : null;
    if (!el) return;
    return applyBrand(el, { brand, brandDark, action, actionDark, accent });
  }, [brand, brandDark, action, actionDark, accent, target]);

  const value = useMemo<BrandingValue>(
    () => ({ brand, brandDark, action, actionDark, accent, logoUrl: logoUrl?.trim() ? logoUrl : null, name }),
    [brand, brandDark, action, actionDark, accent, logoUrl, name],
  );
  return <BrandingContext value={value}>{children}</BrandingContext>;
}

/** The nearest BrandingProvider's colours, logo and name, or null outside one. */
export function useBranding(): BrandingValue | null {
  return use(BrandingContext);
}
