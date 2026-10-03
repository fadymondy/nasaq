/*
 * SEO snippet maths: how long a title or description is against what search engines show, an approximate pixel
 * width, word-boundary truncation and the breadcrumb a result shows for a URL. Pure, shared by the UI and the tests.
 */

export type SeoField = "title" | "description";
export type LengthStatus = "empty" | "short" | "good" | "long";

/** Characters that read well in a result: Google cuts a title near 600px and a description near 160 characters. */
export const SEO_LIMITS: Record<SeoField, { min: number; max: number }> = {
  title: { min: 30, max: 60 },
  description: { min: 70, max: 160 },
};

export interface LengthMeterResult {
  length: number;
  min: number;
  max: number;
  status: LengthStatus;
  /** How full the meter is, 0 to 1 (capped, a long text shows full). */
  fraction: number;
  /** Characters over the limit, 0 when within it. */
  over: number;
}

/** Counts by code point so an emoji or a surrogate pair is one character. Whitespace is trimmed and collapsed. */
export function textLength(text: string): number {
  return [...text.trim().replace(/\s+/g, " ")].length;
}

/** How a title or description measures up: empty, short (under the minimum), good, or long (cut in results). */
export function lengthMeter(field: SeoField, text: string): LengthMeterResult {
  const { min, max } = SEO_LIMITS[field];
  const length = textLength(text);
  const status: LengthStatus = length === 0 ? "empty" : length < min ? "short" : length > max ? "long" : "good";
  return { length, min, max, status, fraction: Math.min(1, length / max), over: Math.max(0, length - max) };
}

/**
 * A rough width in pixels at `fontPx`, from character classes. It is an estimate for a warning, not a font metric:
 * narrow glyphs count 0.3em, capitals and wide glyphs 0.7 to 0.9em, everything else about 0.55em.
 */
export function estimatePixelWidth(text: string, fontPx = 20): number {
  let em = 0;
  for (const ch of text) {
    if (/[il.,;:'"!|()[\]\s]/.test(ch)) em += 0.3;
    else if (/[mwMW@%]/.test(ch)) em += 0.85;
    else if (/[A-Z]/.test(ch)) em += 0.68;
    else if (/[؀-ۿ]/.test(ch)) em += 0.5;
    else em += 0.55;
  }
  return Math.round(em * fontPx);
}

/** Cuts at the last word boundary within `max` characters and adds an ellipsis. Text that fits is returned as is. */
export function truncateAt(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  const chars = [...clean];
  if (chars.length <= max) return clean;
  const head = chars.slice(0, max).join("");
  const space = head.lastIndexOf(" ");
  const cut = space > max * 0.6 ? head.slice(0, space) : head;
  return `${cut.replace(/[\s,.;:\-–—]+$/, "")}…`;
}

/** The host of a URL without "www.", or the input when it is not a URL. */
export function hostOf(url: string): string {
  try {
    return new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The path pieces of a URL, dashes turned to spaces: "/blog/rtl-guide" gives ["blog", "rtl guide"]. */
export function pathSegments(url: string): string[] {
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`);
    return u.pathname
      .split("/")
      .filter(Boolean)
      .map((s) => decodeURIComponent(s).replace(/[-_]+/g, " "));
  } catch {
    return [];
  }
}

/** The breadcrumb line under a result: host first, then the path pieces, joined by the caller. */
export function breadcrumbFor(url: string, custom?: readonly string[]): string[] {
  return custom && custom.length > 0 ? [...custom] : [hostOf(url), ...pathSegments(url)];
}
