/** Pure helpers for the appearance pickers: reading preferences, their CSS variables and wallpapers. No React. */

export type ReadingFontSize = "sm" | "md" | "lg" | "xl";
export type ReadingWidth = "narrow" | "normal" | "wide" | "full";
export type ReadingSpacing = "compact" | "normal" | "relaxed";

/** How a person wants to read: text size, how wide a line of text runs and how tall the lines are. */
export interface ReadingPreferences {
  fontSize: ReadingFontSize;
  width: ReadingWidth;
  spacing: ReadingSpacing;
}

export const READING_FONT_SIZES: readonly ReadingFontSize[] = ["sm", "md", "lg", "xl"];
export const READING_WIDTHS: readonly ReadingWidth[] = ["narrow", "normal", "wide", "full"];
export const READING_SPACINGS: readonly ReadingSpacing[] = ["compact", "normal", "relaxed"];

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = { fontSize: "md", width: "normal", spacing: "normal" };

/** Multiplier on the base text size. */
export const READING_FONT_SCALE: Record<ReadingFontSize, number> = { sm: 0.875, md: 1, lg: 1.125, xl: 1.25 };
/** Line length in characters; `null` is the full width of the container. */
export const READING_WIDTH_CH: Record<ReadingWidth, number | null> = { narrow: 52, normal: 68, wide: 88, full: null };
export const READING_LINE_HEIGHT: Record<ReadingSpacing, number> = { compact: 1.4, normal: 1.6, relaxed: 1.85 };

/** CSS custom properties to put on the reading area: `--reading-scale`, `--reading-max-width`, `--reading-line-height`. */
export function readingStyleVars(preferences: ReadingPreferences): Record<string, string> {
  const ch = READING_WIDTH_CH[preferences.width];
  return {
    "--reading-scale": String(READING_FONT_SCALE[preferences.fontSize]),
    "--reading-max-width": ch === null ? "none" : `${ch}ch`,
    "--reading-line-height": String(READING_LINE_HEIGHT[preferences.spacing]),
  };
}

/** The text size as a percentage of the base size: 112.5 becomes 113. */
export function readingFontPercent(size: ReadingFontSize): number {
  return Math.round(READING_FONT_SCALE[size] * 100);
}

/** One size up (`delta` 1) or down (`delta` -1), stopping at the smallest and largest. */
export function stepReadingFontSize(size: ReadingFontSize, delta: number): ReadingFontSize {
  const index = READING_FONT_SIZES.indexOf(size);
  const next = Math.max(0, Math.min(READING_FONT_SIZES.length - 1, (index < 0 ? 1 : index) + Math.sign(delta)));
  return READING_FONT_SIZES[next] ?? "md";
}

/** True when a value has the three fields with known values. */
export function isReadingPreferences(value: unknown): value is ReadingPreferences {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return READING_FONT_SIZES.includes(v.fontSize as ReadingFontSize) && READING_WIDTHS.includes(v.width as ReadingWidth) && READING_SPACINGS.includes(v.spacing as ReadingSpacing);
}

/** Reads saved preferences (JSON text or an object); unknown or missing fields fall back to the defaults, so old saves keep working. */
export function parseReadingPreferences(saved: unknown): ReadingPreferences {
  let data: unknown = saved;
  if (typeof saved === "string") {
    try {
      data = JSON.parse(saved);
    } catch {
      return { ...DEFAULT_READING_PREFERENCES };
    }
  }
  if (!data || typeof data !== "object") return { ...DEFAULT_READING_PREFERENCES };
  const v = data as Record<string, unknown>;
  return {
    fontSize: READING_FONT_SIZES.includes(v.fontSize as ReadingFontSize) ? (v.fontSize as ReadingFontSize) : DEFAULT_READING_PREFERENCES.fontSize,
    width: READING_WIDTHS.includes(v.width as ReadingWidth) ? (v.width as ReadingWidth) : DEFAULT_READING_PREFERENCES.width,
    spacing: READING_SPACINGS.includes(v.spacing as ReadingSpacing) ? (v.spacing as ReadingSpacing) : DEFAULT_READING_PREFERENCES.spacing,
  };
}

/** True when every field is the default. */
export function isDefaultReading(preferences: ReadingPreferences): boolean {
  return (Object.keys(DEFAULT_READING_PREFERENCES) as (keyof ReadingPreferences)[]).every((key) => preferences[key] === DEFAULT_READING_PREFERENCES[key]);
}

/** A wallpaper: a gradient, a flat colour or a picture. */
export interface AppearanceWallpaper {
  id: string;
  /** Accessible name and tooltip. Localise it. */
  label: string;
  /**
   * A CSS `background` value ("linear-gradient(...)", a colour, `var(--nq-...)`) or the URL of a picture (starts with
   * `http`, `/`, `./` or `data:image`). Prefer token colours so the wallpaper follows the theme.
   */
  background: string;
  /** Section heading the wallpaper is listed under ("Gradients", "Photos"). */
  group?: string;
}

const IMAGE_SOURCE = /^(https?:\/\/|\/|\.\/|\.\.\/|data:image\/|blob:)/i;

/** Whether a wallpaper background is a picture address rather than CSS colours. */
export function isImageWallpaper(background: string): boolean {
  return IMAGE_SOURCE.test(background.trim());
}

/** The CSS `background` shorthand for a wallpaper, covering pictures with `cover`. */
export function wallpaperCss(background: string): string {
  const value = background.trim();
  return isImageWallpaper(value) ? `center / cover no-repeat url("${value.replace(/"/g, "%22")}")` : value;
}

/** Wallpapers grouped by their `group`, keeping the order of first appearance; ungrouped ones come first under `""`. */
export function groupWallpapers(wallpapers: readonly AppearanceWallpaper[]): { group: string; items: AppearanceWallpaper[] }[] {
  const order: string[] = [];
  const buckets = new Map<string, AppearanceWallpaper[]>();
  for (const wallpaper of wallpapers) {
    const key = wallpaper.group ?? "";
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)?.push(wallpaper);
  }
  return order.map((group) => ({ group, items: buckets.get(group) ?? [] }));
}

/** Keeps a dimming amount between 0 and `max` (default 60) percent and whole. */
export function clampWallpaperDim(value: number, max = 60): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}

/** A theme choice: its name and the colours that draw its preview. */
export interface AppearanceTheme {
  id: string;
  label: string;
  description?: string;
  /** Light or dark, shown as a small sun or moon on the card. */
  mode?: "light" | "dark";
  /**
   * Up to four CSS colours for the preview: page background, surface (sidebar and cards), text, accent. Use token colours
   * (`var(--nq-bg)`) or the theme's own values.
   */
  swatches: readonly string[];
}

/** The four preview colours of a theme, repeating the last one when fewer are given so a preview never breaks. */
export function themePreviewColors(theme: AppearanceTheme): [string, string, string, string] {
  const s = theme.swatches;
  const at = (i: number) => s[Math.min(i, s.length - 1)] ?? "transparent";
  return [at(0), at(1), at(2), at(3)];
}
