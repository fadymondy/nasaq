type Segmenter = { segment(s: string): Iterable<{ segment: string }> };

/** First user-perceived character (grapheme), so emoji and surrogate pairs are never split. */
function firstGrapheme(word: string): string {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => Segmenter }).Segmenter;
  if (Seg) {
    for (const { segment } of new Seg(undefined, { granularity: "grapheme" }).segment(word)) return segment;
    return "";
  }
  return Array.from(word)[0] ?? "";
}

/**
 * Up to two initials, taken from the first and last word. Works for Arabic names and surrogate pairs.
 * Leading punctuation is skipped and punctuation-only words are ignored, so "(Test) Driver" is "TD", not "(D".
 */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^\p{P}+/u, ""))
    .filter(Boolean);
  const first = words[0] ? firstGrapheme(words[0]) : "";
  const last = words.length > 1 ? firstGrapheme(words[words.length - 1] as string) : "";
  return (first + last).toUpperCase();
}
