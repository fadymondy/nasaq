/** Pure helpers for BrandGuidelines. No imports, so they run under node --test. */

export interface BrandColor {
  id: string;
  /** Display name. Falls back to the built-in name for a known `id`. */
  name?: string;
  /** Any CSS colour value. Shown and copied exactly as given. */
  value: string;
  /** What it is for, one line. */
  usage?: string;
  /** Colour of the "Aa" sample set on this swatch, for a fill that carries text (an action colour). */
  onColor?: string;
}

export interface BrandManifestColor {
  brand: { light: string; dark: string };
  action: { light: string; dark: string };
  onAction: { light: string; dark: string };
  accent: string;
}

/** Turns a brand manifest's colour block into swatches, in the order a guide reads them. */
export function paletteFromManifest(color: BrandManifestColor): BrandColor[] {
  return [
    { id: "brand-light", value: color.brand.light },
    { id: "brand-dark", value: color.brand.dark },
    { id: "action-light", value: color.action.light, onColor: color.onAction.light },
    { id: "action-dark", value: color.action.dark, onColor: color.onAction.dark },
    { id: "accent", value: color.accent },
  ];
}

export interface BrandDownload {
  id: string;
  name: string;
  /** File type, shown as a badge. */
  format: string;
  /** A URL or data URI the browser downloads unchanged. */
  href: string;
  filename: string;
  /** Which ground the asset is meant for. The preview is drawn on it. */
  ground: "light" | "dark";
}

/** Wraps an SVG string as a download data URI. The markup is passed through unchanged. */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Builds the two mark downloads (light ground, dark ground) from SVG strings made by the brand's own generator. */
export function markDownloadItems(key: string, svgs: { light: string; dark: string }, names: { light: string; dark: string }): BrandDownload[] {
  return [
    { id: "mark-light", name: names.light, format: "SVG", href: svgDataUri(svgs.light), filename: `${key}-mark.svg`, ground: "light" },
    { id: "mark-dark", name: names.dark, format: "SVG", href: svgDataUri(svgs.dark), filename: `${key}-mark-on-dark.svg`, ground: "dark" },
  ];
}

/** The value a swatch copies: the colour exactly as written. */
export function brandColorCopyValue(color: BrandColor): string {
  return color.value.trim();
}

/** "1200 × 630" from a size pair, or the text as given. */
export function ogSizeLabel(size: string | readonly [number, number] | undefined): string {
  if (!size) return "1200 × 630";
  return typeof size === "string" ? size : `${size[0]} × ${size[1]}`;
}
