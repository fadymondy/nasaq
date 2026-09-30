import { type BrandKey, markSvg, resolveBrand } from "@nasaq/brands";
import { type BrandColor, type BrandDownload, markDownloadItems, paletteFromManifest } from "./brand-guidelines-logic";

/** The brand's authoritative colours, straight from its manifest in `@nasaq/brands`. Unknown keys give an empty list. */
export function brandPalette(brand: BrandKey | (string & {})): BrandColor[] {
  const manifest = resolveBrand(brand);
  return manifest ? paletteFromManifest(manifest.color) : [];
}

/**
 * The official mark as an SVG file for a light and for a dark ground, made by the brand package's own generator from the
 * brand's mark spec. Nothing is redrawn, recoloured or stretched. Unknown keys give an empty list.
 */
export function brandMarkDownloads(brand: BrandKey | (string & {}), names: { light: string; dark: string }): BrandDownload[] {
  const manifest = resolveBrand(brand);
  if (!manifest) return [];
  return markDownloadItems(manifest.key, { light: markSvg(manifest.mark, { scheme: "light" }), dark: markSvg(manifest.mark, { scheme: "dark" }) }, names);
}
