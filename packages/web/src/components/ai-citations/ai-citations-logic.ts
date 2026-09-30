/** Pure helpers behind the AI citation components. No React, so they run under node --test. */

const HREF_PREFIX = "#nq-cite-";
const RANGE_LIMIT = 12;

/** The in-page link a `[n]` marker becomes before Markdown renders it. Never leaves the page. */
export function citationHref(n: number): string {
  return `${HREF_PREFIX}${n}`;
}

/** The number in a citation link, or `null` for any other link. */
export function parseCitationHref(href: string | undefined): number | null {
  if (!href || !href.startsWith(HREF_PREFIX)) return null;
  const n = Number(href.slice(HREF_PREFIX.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Numbers inside one marker body: "1", "1, 3", "2-4" (a range is capped at 12). Out-of-range numbers are dropped. */
export function markerNumbers(body: string, max: number): number[] {
  const out: number[] = [];
  for (const part of body.split(",")) {
    const range = part.trim().match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let n = a; n <= b && n < a + RANGE_LIMIT; n++) if (n >= 1 && n <= max) out.push(n);
      continue;
    }
    const n = Number(part.trim());
    if (Number.isInteger(n) && n >= 1 && n <= max) out.push(n);
  }
  return out;
}

const MARKER = /\[(\d{1,3}(?:\s*[,–-]\s*\d{1,3})*)\](?![(:[])/g;

/** Split into runs that may contain markers and runs that must stay literal (fenced code and inline code). */
function splitCode(text: string): { code: boolean; text: string }[] {
  const out: { code: boolean; text: string }[] = [];
  const re = /(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ code: false, text: text.slice(last, m.index) });
    out.push({ code: true, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ code: false, text: text.slice(last) });
  return out;
}

/**
 * Turns `[1]`, `[1, 2]` and `[2-4]` into Markdown links to `#nq-cite-N` so the renderer can swap them for
 * markers. Code stays untouched, and numbers past `max` (no such source) are left as plain text.
 */
export function linkCitations(text: string, max: number): string {
  if (max <= 0) return text;
  return splitCode(text)
    .map((run) =>
      run.code
        ? run.text
        : run.text.replace(MARKER, (whole, body: string) => {
            const nums = markerNumbers(body, max);
            return nums.length === 0 ? whole : nums.map((n) => `[${n}](${citationHref(n)})`).join("");
          }),
    )
    .join("");
}

/** Source numbers the text actually cites, each once, in order of first use. */
export function citedNumbers(text: string, max: number): number[] {
  const seen = new Set<number>();
  for (const run of splitCode(text)) {
    if (run.code) continue;
    for (const m of run.text.matchAll(MARKER)) for (const n of markerNumbers(m[1] as string, max)) seen.add(n);
  }
  return [...seen];
}

/** Paragraphs of prose (not code, headings or list-free blank runs) and how many carry a citation. */
export function citationCoverage(text: string, max: number): { cited: number; total: number } {
  const paragraphs = splitCode(text)
    .filter((r) => !r.code)
    .flatMap((r) => r.text.split(/\n{2,}/))
    .map((p) => p.trim())
    .filter((p) => p !== "" && !p.startsWith("#"));
  const cited = paragraphs.filter((p) => citedNumbers(p, max).length > 0).length;
  return { cited, total: paragraphs.length };
}

export interface HighlightPart {
  text: string;
  hit: boolean;
}

/** Cuts `text` into runs, marking the ones that match any of `terms` (case-insensitive). Plain data, never HTML. */
export function splitHighlight(text: string, terms: readonly string[] | string | undefined): HighlightPart[] {
  const list = (typeof terms === "string" ? [terms] : (terms ?? [])).map((t) => t.trim()).filter((t) => t !== "");
  if (list.length === 0 || text === "") return [{ text, hit: false }];
  const escaped = list.sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  return text
    .split(re)
    .filter((p) => p !== "")
    .map((p) => ({ text: p, hit: list.some((t) => t.toLowerCase() === p.toLowerCase()) }));
}

/** Latency as a value and a unit: 480 ms stays milliseconds, 1240 ms becomes 1.2 s. */
export function latencyParts(ms: number): { value: number; unit: "ms" | "s" } {
  if (!Number.isFinite(ms) || ms < 0) return { value: 0, unit: "ms" };
  return ms < 1000 ? { value: Math.round(ms), unit: "ms" } : { value: Math.round(ms / 100) / 10, unit: "s" };
}
