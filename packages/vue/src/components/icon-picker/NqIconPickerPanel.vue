<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { computed, nextTick, onMounted, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { ICON_CATALOG, ICON_CATEGORIES, type IconEntry } from "./icon-catalog";
import { findIcon, PAGE, RECENT_KEY, STRINGS, type IconPickerLabels } from "./icon-picker";
import { filterIcons, nextGridIndex, pushRecent } from "./icon-search";

interface Props {
  /** The chosen icon's kebab-case name (v-model). */
  modelValue?: string | null;
  defaultValue?: string | null;
  /** Your own icons instead of the built-in ~220. */
  icons?: readonly IconEntry[];
  /** Recent icons (controlled). Otherwise they are kept in localStorage. */
  recent?: string[];
  /** localStorage key for recents, or `null` to keep them in memory only. */
  recentKey?: string | null;
  /** Tiles per row. Default 8. */
  columns?: number;
  /** Icons rendered before "Show more". Default 96. */
  pageSize?: number;
  autoFocus?: boolean;
  class?: HTMLAttributes["class"];
  labels?: Partial<Omit<IconPickerLabels, "categories">> & { categories?: Record<string, string> };
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: null,
  icons: () => ICON_CATALOG,
  recent: undefined,
  recentKey: RECENT_KEY,
  columns: 8,
  pageSize: PAGE,
});
const emit = defineEmits<{
  "update:modelValue": [name: string];
  select: [name: string, entry: IconEntry];
  "update:recent": [recent: string[]];
}>();

const nq = useNasaq();
const isAr = computed(() => nq.locale.value.startsWith("ar"));
const isRtl = computed(() => nq.isRtl.value);
const t = computed(() => {
  const base = STRINGS[isAr.value ? "ar" : "en"];
  return { ...base, ...props.labels, categories: { ...base.categories, ...props.labels?.categories } };
});
const id = useId();
const inner = ref<string | null>(props.defaultValue);
const value = computed(() => (props.modelValue === undefined ? inner.value : props.modelValue));
const query = ref("");
const category = ref<string | null>(null);
const limit = ref(props.pageSize);
const active = ref(0);
const innerRecent = ref<string[]>([]);
const grid = ref<HTMLElement | null>(null);
const search = ref<HTMLInputElement | null>(null);
const fmt = computed(() => new Intl.NumberFormat(nq.locale.value));

onMounted(() => {
  if (props.autoFocus) search.value?.focus();
  if (!props.recentKey || props.recent) return;
  try {
    const raw = JSON.parse(localStorage.getItem(props.recentKey) ?? "[]");
    if (Array.isArray(raw)) innerRecent.value = raw.filter((n): n is string => typeof n === "string");
  } catch {
    /* Storage is unavailable or holds junk: start empty. */
  }
});
const recent = computed(() => props.recent ?? innerRecent.value);

const categories = computed(() => {
  const seen = new Set(props.icons.map((i) => i.category));
  const order = ICON_CATEGORIES.filter((c) => seen.has(c));
  return [...order, ...[...seen].filter((c) => !order.includes(c as never))] as string[];
});
const matches = computed(() => filterIcons(props.icons, query.value, category.value));
const recentEntries = computed(() => recent.value.map((r) => findIcon(r, props.icons)).filter((e): e is IconEntry => Boolean(e)));
const showRecent = computed(() => !query.value && !category.value && recentEntries.value.length > 0);
const shown = computed(() => matches.value.slice(0, limit.value));
const tabs = computed(() => [null, ...categories.value] as (string | null)[]);

// A new search or category starts from the top.
watch([query, category, () => props.pageSize], () => {
  limit.value = props.pageSize;
  active.value = 0;
});

function choose(entry: IconEntry) {
  inner.value = entry.name;
  const next = pushRecent(recent.value, entry.name);
  innerRecent.value = next;
  emit("update:recent", next);
  if (props.recentKey && !props.recent) {
    try {
      localStorage.setItem(props.recentKey, JSON.stringify(next));
    } catch {
      /* Ignore quota or privacy-mode errors. */
    }
  }
  emit("update:modelValue", entry.name);
  emit("select", entry.name, entry);
}

async function focusTile(index: number) {
  active.value = index;
  await nextTick();
  grid.value?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus();
}

function onGridKey(e: KeyboardEvent) {
  const target = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
  if (!target) return;
  const index = Number(target.dataset.index);
  if (e.key === "ArrowDown" && index + props.columns >= shown.value.length && shown.value.length < matches.value.length) {
    // Down from the last visible row reveals the next page.
    e.preventDefault();
    limit.value += props.pageSize;
    void focusTile(Math.min(index + props.columns, matches.value.length - 1));
    return;
  }
  if (e.key === "ArrowUp" && index < props.columns) {
    e.preventDefault();
    search.value?.focus();
    return;
  }
  const next = nextGridIndex(e.key, index, shown.value.length, props.columns, isRtl.value);
  if (next !== index && next >= 0) {
    e.preventDefault();
    void focusTile(next);
  }
}

function onSearchKey(e: KeyboardEvent) {
  if (e.key === "ArrowDown" && shown.value.length) {
    e.preventDefault();
    void focusTile(active.value < shown.value.length ? active.value : 0);
  }
}
</script>

<template>
  <div data-slot="icon-picker" :class="cn('flex w-80 max-w-full flex-col bg-popover text-popover-foreground', props.class)">
    <div class="relative border-b border-border p-2">
      <Search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-5 my-auto size-4 text-muted-foreground" />
      <input
        ref="search"
        v-model="query"
        type="search"
        :aria-label="t.search"
        :placeholder="t.search"
        :aria-controls="`${id}-grid`"
        :class="
          cn(
            'h-control-sm w-full min-w-0 rounded-control border border-input bg-card ps-8 pe-2 text-body-sm text-foreground outline-none',
            'placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
          )
        "
        @keydown="onSearchKey"
      />
    </div>

    <div role="tablist" :aria-label="t.grid" class="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5 [scrollbar-width:none]">
      <button
        v-for="c in tabs"
        :key="c ?? 'all'"
        type="button"
        role="tab"
        :aria-selected="category === c"
        :class="
          cn(
            'shrink-0 rounded-full px-2.5 py-1 text-caption outline-none transition-colors duration-150 ease-nq',
            'focus-visible:outline-2 focus-visible:outline-nq-focus',
            category === c ? 'bg-nq-selected text-foreground font-medium' : 'text-muted-foreground hover:bg-nq-hover hover:text-foreground',
          )
        "
        @click="category = c"
      >
        {{ c === null ? t.all : (t.categories[c] ?? c) }}
      </button>
    </div>

    <div class="max-h-64 overflow-y-auto p-2">
      <div v-if="showRecent" class="mb-2 flex flex-col gap-1" data-slot="icon-picker-recent">
        <div class="px-1 text-caption font-medium text-muted-foreground">{{ t.recent }}</div>
        <div class="flex flex-wrap gap-0.5" role="group" :aria-label="t.recent">
          <button
            v-for="entry in recentEntries"
            :key="entry.name"
            type="button"
            :aria-label="entry.name"
            :title="entry.name"
            :aria-pressed="value === entry.name"
            class="flex size-9 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:bg-nq-selected"
            @click="choose(entry)"
          >
            <component :is="entry.icon" aria-hidden="true" class="size-5" />
          </button>
        </div>
      </div>

      <div
        v-if="matches.length"
        :id="`${id}-grid`"
        ref="grid"
        role="listbox"
        :aria-label="t.grid"
        class="grid gap-0.5"
        :style="{ gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))`, justifyItems: 'center' }"
        @keydown="onGridKey"
      >
        <button
          v-for="(entry, i) in shown"
          :key="entry.name"
          type="button"
          role="option"
          :aria-selected="value === entry.name"
          :aria-label="entry.name"
          :title="entry.name"
          :data-index="i"
          :data-selected="value === entry.name ? '' : undefined"
          :tabindex="i === active ? 0 : -1"
          :class="
            cn(
              'flex size-9 items-center justify-center rounded-control text-foreground outline-none transition-colors duration-150 ease-nq',
              'hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-[selected]:bg-nq-selected data-[selected]:font-medium',
            )
          "
          @click="choose(entry)"
          @focus="active = i"
        >
          <component :is="entry.icon" aria-hidden="true" class="size-5" />
        </button>
      </div>
      <p v-else class="px-2 py-8 text-center text-body-sm text-muted-foreground">{{ t.empty(query) }}</p>

      <div v-if="shown.length < matches.length" class="mt-2 flex justify-center">
        <NqButton variant="ghost" size="sm" @click="limit += props.pageSize">{{ t.showMore(fmt.format(matches.length - shown.length)) }}</NqButton>
      </div>
    </div>
    <p role="status" class="sr-only">{{ t.results(fmt.format(matches.length)) }}</p>
  </div>
</template>
