// Emoji data for the picker. Emojibase is fetched from the jsDelivr CDN on first use and cached for the page,
// so it adds nothing to the JS payload (the same approach as the React picker's `frimousse`).

export interface EmojiSelection {
  emoji: string;
  label: string;
}
export type EmojiSkinTone = "none" | "light" | "medium-light" | "medium" | "medium-dark" | "dark";
export const SKIN_TONES: readonly EmojiSkinTone[] = ["none", "light", "medium-light", "medium", "medium-dark", "dark"];

export interface EmojiRecord {
  emoji: string;
  label: string;
  /** Emojibase group index. */
  group: number;
  order: number;
  keywords: string[];
  /** Skin variants, index 0 is tone "light". */
  skins?: string[];
}
export interface EmojiCategoryData {
  index: number;
  label: string;
}
export interface EmojiData {
  emojis: EmojiRecord[];
  categories: EmojiCategoryData[];
}

/** Locales Emojibase can load. Arabic is not one of them, so an Arabic UI falls back to English emoji names and search. */
const DATA_LOCALES = new Set([
  "bn", "da", "de", "en-gb", "en", "es-mx", "es", "et", "fi", "fr", "hi", "hu", "it", "ja", "ko", "lt", "ms", "nb", "nl", "pl", "pt", "ru", "sv", "th", "uk", "vi", "zh-hant", "zh",
]);

/** The emoji-data locale for a UI locale: the locale itself when Emojibase has it, otherwise its base language, otherwise "en". */
export function resolveEmojiLocale(locale: string): string {
  const lower = locale.toLowerCase();
  if (DATA_LOCALES.has(lower)) return lower;
  const base = lower.split("-")[0] ?? "en";
  return DATA_LOCALES.has(base) ? base : "en";
}

export const EMOJIBASE_URL = "https://cdn.jsdelivr.net/npm/emojibase-data@16";

interface RawEmoji {
  emoji: string;
  label: string;
  group?: number;
  order?: number;
  tags?: string[];
  skins?: { emoji: string }[];
}
interface RawMessages {
  groups: { order: number; message: string }[];
}

const cache = new Map<string, Promise<EmojiData>>();

export function loadEmojiData(locale: string, base: string = EMOJIBASE_URL): Promise<EmojiData> {
  const key = `${base}|${locale}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      const [compact, messages] = await Promise.all([
        fetch(`${base}/${locale}/compact.json`).then((r) => r.json() as Promise<RawEmoji[]>),
        fetch(`${base}/${locale}/messages.json`).then((r) => r.json() as Promise<RawMessages>),
      ]);
      return buildEmojiData(compact, messages);
    })();
    hit.catch(() => cache.delete(key));
    cache.set(key, hit);
  }
  return hit;
}

export function buildEmojiData(compact: RawEmoji[], messages: RawMessages): EmojiData {
  // Group 2 is "components" (skin-tone swatches, hair): not for picking.
  const emojis = compact
    .filter((e) => e.group !== undefined && e.group !== 2)
    .map<EmojiRecord>((e) => ({
      emoji: e.emoji,
      label: e.label,
      group: e.group as number,
      order: e.order ?? 0,
      keywords: e.tags ?? [],
      skins: e.skins?.map((s) => s.emoji),
    }))
    .sort((a, b) => a.order - b.order);
  const used = new Set(emojis.map((e) => e.group));
  const categories = messages.groups.filter((g) => used.has(g.order)).map((g) => ({ index: g.order, label: g.message }));
  return { emojis, categories };
}

/** Emoji for the chosen skin tone, falling back to the base emoji when it has no variants. */
export function emojiForTone(e: EmojiRecord, tone: EmojiSkinTone): string {
  const i = SKIN_TONES.indexOf(tone) - 1;
  return i >= 0 ? (e.skins?.[i] ?? e.emoji) : e.emoji;
}

export function filterEmojis(emojis: readonly EmojiRecord[], query: string): EmojiRecord[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...emojis];
  return emojis.filter((e) => {
    const hay = `${e.label} ${e.keywords.join(" ")}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
