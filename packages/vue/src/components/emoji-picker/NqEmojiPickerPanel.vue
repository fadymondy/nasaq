<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { computed, nextTick, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { nextGridIndex } from "../icon-picker/icon-search";
import {
  emojiForTone,
  filterEmojis,
  loadEmojiData,
  resolveEmojiLocale,
  SKIN_TONES,
  type EmojiData,
  type EmojiRecord,
  type EmojiSelection,
  type EmojiSkinTone,
} from "./emoji-data";

const STRINGS = {
  en: {
    trigger: "Choose emoji",
    search: "Search emoji",
    loading: "Loading emoji…",
    empty: (q: string) => `No emoji found for “${q}”.`,
    skinTone: "Change skin tone",
  },
  ar: {
    trigger: "اختيار رمز تعبيري",
    search: "ابحث عن رمز تعبيري",
    loading: "جارٍ تحميل الرموز…",
    empty: (q: string) => `لا توجد رموز مطابقة لـ «${q}».`,
    skinTone: "تغيير لون البشرة",
  },
};

interface Props {
  /** Emoji-data locale. Defaults to the Nasaq locale, falling back to English where Emojibase has no data (Arabic). */
  locale?: string;
  /** Initial skin tone. */
  skinTone?: EmojiSkinTone;
  /** Emoji per row. Default 8. */
  columns?: number;
  /** Supply the data yourself instead of fetching Emojibase from the CDN. */
  resolveEmojiData?: (locale: string) => Promise<EmojiData>;
  /** Override the built-in strings. */
  labels?: Partial<{ search: string; loading: string; empty: (query: string) => string; skinTone: string }>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { locale: undefined, skinTone: "none", columns: 8, resolveEmojiData: undefined, labels: undefined });
const emit = defineEmits<{ emojiSelect: [emoji: EmojiSelection] }>();

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const dataLocale = computed(() => props.locale ?? resolveEmojiLocale(nq.locale.value));
const root = ref<HTMLElement | null>(null);
const data = ref<EmojiData | null>(null);
const query = ref("");
const tone = ref<EmojiSkinTone>(props.skinTone);
const active = ref(0);

async function load() {
  data.value = null;
  data.value = await (props.resolveEmojiData ?? loadEmojiData)(dataLocale.value);
}
onMounted(load);
watch(dataLocale, load);

const matches = computed(() => (data.value ? filterEmojis(data.value.emojis, query.value) : []));
// Flat index across categories, so arrow keys walk one continuous list.
const sections = computed(() => {
  let offset = 0;
  const out: { index: number; label: string; items: { emoji: EmojiRecord; flat: number }[] }[] = [];
  for (const c of data.value?.categories ?? []) {
    const items = matches.value.filter((e) => e.group === c.index).map((emoji, i) => ({ emoji, flat: offset + i }));
    if (!items.length) continue;
    offset += items.length;
    out.push({ index: c.index, label: c.label, items });
  }
  return out;
});
const count = computed(() => sections.value.reduce((n, s) => n + s.items.length, 0));
watch(query, () => (active.value = 0));

function pick(e: EmojiRecord) {
  emit("emojiSelect", { emoji: emojiForTone(e, tone.value), label: e.label });
}

function cycleTone() {
  tone.value = SKIN_TONES[(SKIN_TONES.indexOf(tone.value) + 1) % SKIN_TONES.length]!;
}
const toneGlyph = computed(() => emojiForTone({ emoji: "✋", label: "hand", group: 1, order: 0, keywords: [], skins: ["✋🏻", "✋🏼", "✋🏽", "✋🏾", "✋🏿"] }, tone.value));

async function focusCell(index: number) {
  active.value = index;
  await nextTick();
  root.value?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus();
}

function onKey(e: KeyboardEvent) {
  if (!count.value) return;
  const target = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
  if (!target) {
    if (e.key === "ArrowDown" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      void focusCell(Math.min(active.value, count.value - 1));
    }
    return;
  }
  const index = Number(target.dataset.index);
  if (e.key === "ArrowUp" && index < props.columns) {
    e.preventDefault();
    root.value?.querySelector<HTMLInputElement>("input")?.focus();
    return;
  }
  // The grid itself mirrors in RTL, so the "next" cell is on the left: swap the horizontal arrows.
  const next = nextGridIndex(e.key, index, count.value, props.columns, nq.isRtl.value);
  if (next !== index && next >= 0) {
    e.preventDefault();
    void focusCell(next);
  }
}
</script>

<template>
  <div
    ref="root"
    data-slot="emoji-picker"
    :class="cn('isolate flex h-80 w-72 flex-col bg-popover text-popover-foreground', props.class)"
    @keydown="onKey"
  >
    <div class="flex items-center gap-2 border-b border-border p-2">
      <div class="relative min-w-0 flex-1">
        <Search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
        <input
          v-model="query"
          type="search"
          data-slot="emoji-picker-search"
          :aria-label="t.search"
          :placeholder="t.search"
          :class="
            cn(
              'h-control-sm w-full min-w-0 rounded-control border border-input bg-card ps-8 pe-2 text-body-sm text-foreground outline-none',
              'placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
            )
          "
        />
      </div>
      <button
        type="button"
        data-slot="emoji-picker-skin-tone"
        :aria-label="t.skinTone"
        :class="
          cn(
            'inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-body outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
          )
        "
        @click="cycleTone"
      >
        {{ toneGlyph }}
      </button>
    </div>
    <div data-slot="emoji-picker-viewport" class="relative flex-1 overflow-y-auto outline-none">
      <div v-if="!data" role="status" class="absolute inset-0 flex items-center justify-center text-body-sm text-muted-foreground">{{ t.loading }}</div>
      <div v-else-if="!count" role="status" class="absolute inset-0 flex items-center justify-center px-4 text-center text-body-sm text-muted-foreground">
        {{ t.empty(query) }}
      </div>
      <div v-else role="grid" class="select-none pb-1">
        <section v-for="s in sections" :key="s.index">
          <div data-slot="emoji-picker-category" class="sticky top-0 bg-popover px-3 py-1.5 text-start text-caption font-medium text-muted-foreground">{{ s.label }}</div>
          <div data-slot="emoji-picker-row" class="grid scroll-my-1 px-1.5" :style="{ gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))`, justifyItems: 'center' }">
            <button
              v-for="item in s.items"
              :key="item.emoji.emoji"
              type="button"
              data-slot="emoji-picker-emoji"
              role="gridcell"
              :aria-label="item.emoji.label"
              :data-index="item.flat"
              :data-active="item.flat === active ? '' : undefined"
              :tabindex="item.flat === active ? 0 : -1"
              :class="
                cn(
                  'flex size-8 items-center justify-center rounded-control text-[20px] leading-none outline-none',
                  'hover:bg-nq-hover data-[active]:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus',
                )
              "
              @click="pick(item.emoji)"
              @focus="active = item.flat"
            >
              {{ emojiForTone(item.emoji, tone) }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
