/**
 * Pure helpers for the text effects: how a string is cut into animatable pieces.
 *
 * Arabic (and other joining scripts) change the shape of a letter by its neighbours. If every letter sits in its own
 * inline box the letters stop joining and the word reads as broken, so those scripts are only ever split on words.
 */

export type TextSplitMode = "word" | "grapheme";

export interface TextToken {
  /** The piece of text, exactly as it appears in the source. */
  text: string;
  /** Whitespace between words. Render it as plain text, never in its own animated box. */
  space: boolean;
  /** Position among the animatable (non-space) tokens, or -1 for a space. */
  order: number;
}

export interface SplitResult {
  /** The mode that was really used: "grapheme" falls back to "word" for joining scripts. */
  mode: TextSplitMode;
  tokens: TextToken[];
}

/** Scripts whose letters connect to each other: Arabic and its supplements, Syriac, N'Ko, Mandaic, Mongolian, Adlam, Hanifi Rohingya. */
const JOINING_SCRIPT = /[؀-ۿ܀-ݏݐ-ݿ߀-߿ࡀ-࡟ࡠ-࡯ࡰ-࢟ࢠ-ࣿ᠀-᢯ﭐ-﷿ﹰ-﻿\u{1E900}-\u{1E95F}\u{10D00}-\u{10D3F}]/u;

/** True when the text contains a script whose letters join, so it must not be cut inside a word. */
export function hasJoiningScript(text: string): boolean {
  return JOINING_SCRIPT.test(text);
}

interface SegmenterLike {
  segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }>;
}
type SegmenterCtor = new (locale?: string | string[], options?: { granularity: "grapheme" | "word" | "sentence" }) => SegmenterLike;

function segmenter(granularity: "grapheme" | "word", locale?: string): SegmenterLike | null {
  const Ctor = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  if (!Ctor) return null;
  try {
    return new Ctor(locale, { granularity });
  } catch {
    return null;
  }
}

const isSpaceOnly = (text: string) => /^\s+$/u.test(text);

/** Words and the whitespace between them; punctuation stays attached to the word it touches. */
function splitWords(text: string, locale?: string): string[] {
  // Whitespace separates the pieces; the Segmenter only decides boundaries inside a run of unspaced text (CJK, Thai).
  const runs = text.match(/\s+|\S+/gu) ?? [];
  const unspaced = /[぀-ヿ㐀-鿿฀-๿]/u;
  const out: string[] = [];
  for (const run of runs) {
    if (isSpaceOnly(run) || !unspaced.test(run)) {
      out.push(run);
      continue;
    }
    const seg = segmenter("word", locale);
    if (!seg) {
      out.push(run);
      continue;
    }
    for (const part of seg.segment(run)) out.push(part.segment);
  }
  return out;
}

function splitGraphemes(text: string, locale?: string): string[] {
  const seg = segmenter("grapheme", locale);
  if (seg) return Array.from(seg.segment(text), (part) => part.segment);
  return Array.from(text);
}

/**
 * Cuts text into pieces to animate. `mode: "grapheme"` cuts user-perceived characters (an emoji or a letter with its
 * accents stays whole) but only for scripts that do not join; Arabic and friends always come back split on words.
 * Joining the returned `text` values always gives the input back.
 */
export function splitText(text: string, mode: TextSplitMode = "word", locale?: string): SplitResult {
  const used: TextSplitMode = mode === "grapheme" && !hasJoiningScript(text) ? "grapheme" : "word";
  const pieces = used === "grapheme" ? splitGraphemes(text, locale) : splitWords(text, locale);
  let order = 0;
  const tokens = pieces.map((piece) => {
    const space = isSpaceOnly(piece);
    return { text: piece, space, order: space ? -1 : order++ };
  });
  return { mode: used, tokens };
}

/** The number of animatable tokens (spaces do not count). */
export function countTextTokens(tokens: readonly TextToken[]): number {
  return tokens.reduce((n, t) => n + (t.space ? 0 : 1), 0);
}

/** The text with only the first `count` animatable tokens (and the spaces between them), for typing and reveals. */
export function revealTextTokens(tokens: readonly TextToken[], count: number): string {
  let shown = 0;
  let out = "";
  for (const token of tokens) {
    if (token.space) {
      if (shown > 0 && shown < count) out += token.text;
      continue;
    }
    if (shown >= count) break;
    out += token.text;
    shown += 1;
  }
  return out;
}

/** The index after `index`, wrapping to 0; -1 when there is nothing to rotate. */
export function nextFlipIndex(index: number, length: number, loop = true): number {
  if (length <= 0) return -1;
  if (index + 1 < length) return index + 1;
  return loop ? 0 : index;
}

/** Seconds a marquee copy takes to travel its own width at `speed` pixels per second; never below one second. */
export function marqueeDuration(copyWidth: number, speed: number): number {
  if (!(copyWidth > 0) || !(speed > 0)) return 0;
  return Math.max(1, copyWidth / speed);
}

/** How many copies of a marquee's content fill `containerWidth` while one copy scrolls away: enough to cover it, plus one. */
export function marqueeCopies(containerWidth: number, copyWidth: number): number {
  if (!(copyWidth > 0) || !(containerWidth > 0)) return 2;
  return Math.max(2, Math.ceil(containerWidth / copyWidth) + 1);
}

/** Per-token transition delay in ms, capped so long text never takes more than `maxTotal` ms to finish. */
export function textStaggerDelay(order: number, count: number, step = 40, maxTotal = 600): number {
  if (count <= 1) return 0;
  const effective = Math.min(step, maxTotal / (count - 1));
  return Math.round(order * effective);
}
