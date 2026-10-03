// nqEmojiPicker: search, skin tone and an arrow-key emoji grid over Emojibase data.
//
//   <div x-data="nqEmojiPicker('none', 8)" x-ref="root" x-on:keydown="onKey($event)">
//     <input x-model="query">
//     <button x-on:click="cycleTone()" x-text="toneGlyph"></button>
//     <template x-for="s in sections" x-bind:key="s.index"> … <template x-for="item in s.items"> <button x-on:click="pick(item.emoji)"
//       x-bind:data-index="item.flat" x-text="glyph(item.emoji)"> … </template> </template>
//   </div>
//
// The data is Emojibase (compact.json + messages.json), fetched from the jsDelivr CDN on first use and cached for the page. To
// supply it yourself (offline, another locale source) set window.nqEmojiData = (locale) => Promise<EmojiData> before the picker
// mounts. Arabic has no Emojibase data, so an Arabic page shows English emoji names. Choosing dispatches `emoji-select`
// ({ emoji, label }). Arrow keys follow the reading direction.

import type { Magics, Register } from "./types";
import { nextGridIndex } from "./icon-picker";

export interface EmojiSelection {
  emoji: string;
  label: string;
}
export type EmojiSkinTone = "none" | "light" | "medium-light" | "medium" | "medium-dark" | "dark";
export const SKIN_TONES: readonly EmojiSkinTone[] = ["none", "light", "medium-light", "medium", "medium-dark", "dark"];

export interface EmojiRecord {
  emoji: string;
  label: string;
  group: number;
  order: number;
  keywords: string[];
  /** Skin variants, index 0 is tone "light". */
  skins?: string[];
}
export interface EmojiData {
  emojis: EmojiRecord[];
  categories: { index: number; label: string }[];
}
interface RawEmoji {
  emoji: string;
  label: string;
  group?: number;
  order?: number;
  tags?: string[];
  skins?: { emoji: string }[];
}

const DATA_LOCALES = new Set([
  "bn", "da", "de", "en-gb", "en", "es-mx", "es", "et", "fi", "fr", "hi", "hu", "it", "ja", "ko", "lt", "ms", "nb", "nl", "pl", "pt", "ru", "sv", "th", "uk", "vi", "zh-hant", "zh",
]);

/** The emoji-data locale for a UI locale: itself when Emojibase has it, else its base language, else "en" (Arabic included). */
export function resolveEmojiLocale(locale: string): string {
  const lower = locale.toLowerCase();
  if (DATA_LOCALES.has(lower)) return lower;
  const base = lower.split("-")[0] ?? "en";
  return DATA_LOCALES.has(base) ? base : "en";
}

export const EMOJIBASE_URL = "https://cdn.jsdelivr.net/npm/emojibase-data@16";

/** Emojibase compact.json + messages.json into the picker's data (drops the "components" group). */
export function buildEmojiData(compact: RawEmoji[], messages: { groups: { order: number; message: string }[] }): EmojiData {
  const emojis = compact
    .filter((e) => e.group !== undefined && e.group !== 2)
    .map<EmojiRecord>((e) => ({ emoji: e.emoji, label: e.label, group: e.group as number, order: e.order ?? 0, keywords: e.tags ?? [], skins: e.skins?.map((s) => s.emoji) }))
    .sort((a, b) => a.order - b.order);
  const used = new Set(emojis.map((e) => e.group));
  return { emojis, categories: messages.groups.filter((g) => used.has(g.order)).map((g) => ({ index: g.order, label: g.message })) };
}

const cache = new Map<string, Promise<EmojiData>>();
export function loadEmojiData(locale: string, base: string = EMOJIBASE_URL): Promise<EmojiData> {
  const key = `${base}|${locale}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      const [compact, messages] = await Promise.all([
        fetch(`${base}/${locale}/compact.json`).then((r) => r.json() as Promise<RawEmoji[]>),
        fetch(`${base}/${locale}/messages.json`).then((r) => r.json()),
      ]);
      return buildEmojiData(compact, messages);
    })();
    hit.catch(() => cache.delete(key));
    cache.set(key, hit);
  }
  return hit;
}

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

interface Section {
  index: number;
  label: string;
  items: { emoji: EmojiRecord; flat: number }[];
}

interface EmojiState extends Magics {
  data: EmojiData | null;
  query: string;
  tone: EmojiSkinTone;
  active: number;
  columns: number;
  sections: Section[];
  count: number;
  load(): Promise<void>;
  refilter(): void;
  focusCell(index: number): void;
  $store: { nq: { locale: string } };
}

declare global {
  interface Window {
    /** Supply Emojibase-shaped data yourself instead of fetching it from the CDN. */
    nqEmojiData?: (locale: string) => Promise<EmojiData>;
  }
}

export const emojiPicker: Register = (Alpine) => {
  Alpine.data("nqEmojiPicker", (tone: EmojiSkinTone = "none", columns = 8) => ({
    data: null as EmojiData | null,
    query: "",
    tone,
    active: 0,
    columns,
    sections: [] as Section[],
    count: 0,

    init(this: EmojiState) {
      void this.load();
      this.$watch("query", () => {
        this.active = 0;
        this.refilter();
      });
      const onLocale = () => void this.load();
      document.documentElement.addEventListener("nq:locale", onLocale);
      (this.$el as HTMLElement & { _nqOff?: () => void })._nqOff = () => document.documentElement.removeEventListener("nq:locale", onLocale);
    },
    destroy(this: EmojiState) {
      (this.$el as HTMLElement & { _nqOff?: () => void })._nqOff?.();
    },

    async load(this: EmojiState) {
      const locale = resolveEmojiLocale(this.$store.nq.locale);
      this.data = null;
      this.refilter();
      try {
        this.data = await (window.nqEmojiData ?? loadEmojiData)(locale);
      } catch {
        this.data = { emojis: [], categories: [] };
      }
      this.refilter();
    },

    /** Rebuilds the sections: one flat index across categories, so the arrows walk one continuous list. */
    refilter(this: EmojiState) {
      const matches = this.data ? filterEmojis(this.data.emojis, this.query) : [];
      let offset = 0;
      const out: Section[] = [];
      for (const c of this.data?.categories ?? []) {
        const items = matches.filter((e) => e.group === c.index).map((emoji, i) => ({ emoji, flat: offset + i }));
        if (!items.length) continue;
        offset += items.length;
        out.push({ index: c.index, label: c.label, items });
      }
      this.sections = out;
      this.count = offset;
    },

    glyph(this: EmojiState, e: EmojiRecord): string {
      return emojiForTone(e, this.tone);
    },
    get toneGlyph(): string {
      const hand: EmojiRecord = { emoji: "✋", label: "hand", group: 1, order: 0, keywords: [], skins: ["✋🏻", "✋🏼", "✋🏽", "✋🏾", "✋🏿"] };
      return emojiForTone(hand, (this as unknown as EmojiState).tone);
    },
    cycleTone(this: EmojiState) {
      this.tone = SKIN_TONES[(SKIN_TONES.indexOf(this.tone) + 1) % SKIN_TONES.length]!;
    },
    pick(this: EmojiState, e: EmojiRecord) {
      this.$dispatch("emoji-select", { emoji: emojiForTone(e, this.tone), label: e.label } satisfies EmojiSelection);
    },

    focusCell(this: EmojiState, index: number) {
      this.active = index;
      this.$nextTick(() => this.$el.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus());
    },

    onKey(this: EmojiState, event: KeyboardEvent) {
      if (!this.count) return;
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
      if (!target) {
        if (event.key === "ArrowDown" && (event.target as HTMLElement).tagName === "INPUT") {
          event.preventDefault();
          this.focusCell(Math.min(this.active, this.count - 1));
        }
        return;
      }
      const index = Number(target.dataset.index);
      if (event.key === "ArrowUp" && index < this.columns) {
        event.preventDefault();
        this.$el.querySelector<HTMLInputElement>("input")?.focus();
        return;
      }
      const rtl = this.$el.closest("[dir]")?.getAttribute("dir") === "rtl" || document.documentElement.dir === "rtl";
      const next = nextGridIndex(event.key, index, this.count, this.columns, rtl);
      if (next !== index && next >= 0) {
        event.preventDefault();
        this.focusCell(next);
      }
    },
  }));
};
