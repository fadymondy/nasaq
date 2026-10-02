<script setup lang="ts">
import { Clock, Loader2, Search, TrendingUp, X } from "lucide-vue-next";
import { computed, h, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { useFormatNumber } from "../numeric";
import type { CommerceProduct } from "../store-listing/commerce";
import { listingMinPrice, type ListingCategoryNode } from "../store-listing/listing-model";
import { NqStorePrice, NqStoreProductImage } from "../store-listing";
import {
  chromeFlattenCategories,
  chromeHighlight,
  chromeMoveActive,
  chromeRecordRecent,
  chromeSuggest,
  type ChromeSuggestion,
} from "./store-chrome-model";
import { storeChromeFill, useStoreChromeStrings, type StoreChromeLabels } from "./strings";

// Search box with autocomplete: matching categories and products (image, name with the match emphasised, price), recent and
// popular searches on focus. Arrow keys move, Enter picks, Escape closes. A real ARIA combobox.
interface Row {
  key: string;
  suggestion: ChromeSuggestion | null;
  /** The trailing "Search for ..." row. */
  submit?: boolean;
}

const props = withDefaults(
  defineProps<{
    /** Catalogue for suggestions. */
    products: readonly CommerceProduct[];
    /** Category tree for category suggestions. */
    categoryTree?: readonly ListingCategoryNode[];
    /** ISO 4217 code; adds a price to product suggestions. */
    currency?: string;
    /** Recent searches (v-model:recent). Without it the box keeps its own. */
    recent?: readonly string[];
    /** Searches to offer on an empty box. */
    popular?: readonly string[];
    /** Text in the box (v-model). */
    modelValue?: string;
    /** Enter, or choosing a query suggestion. */
    onSearch?: (query: string) => void;
    onSelectProduct?: (product: CommerceProduct) => void;
    onSelectCategory?: (categoryId: string, label: string) => void;
    /** Product page URL for a suggestion; makes the row a real link for middle-click. */
    getProductHref?: (product: CommerceProduct) => string;
    /** Show a spinner while suggestions load from a server. */
    loading?: boolean;
    placeholder?: string;
    labels?: StoreChromeLabels;
    class?: HTMLAttributes["class"];
  }>(),
  {
    categoryTree: () => [],
    currency: undefined,
    recent: undefined,
    popular: () => [],
    modelValue: undefined,
    onSearch: undefined,
    onSelectProduct: undefined,
    onSelectCategory: undefined,
    getProductHref: undefined,
    loading: false,
    placeholder: undefined,
    labels: undefined,
  },
);
const emit = defineEmits<{ "update:modelValue": [value: string]; "update:recent": [recent: string[]]; search: [query: string] }>();

const { t } = useStoreChromeStrings(() => props.labels);
const fmt = useFormatNumber();
const uid = useId();
const listId = `${uid}-list`;
const innerValue = ref("");
const innerRecent = ref<string[]>([]);
const open = ref(false);
const active = ref(-1);
const root = ref<HTMLElement | null>(null);
const input = ref<{ $el: HTMLElement } | null>(null);

const value = computed(() => props.modelValue ?? innerValue.value);
const recent = computed(() => props.recent ?? innerRecent.value);
const categories = computed(() => chromeFlattenCategories(props.categoryTree));
const suggestions = computed(() => chromeSuggest(props.products, value.value, { categories: categories.value, recent: recent.value, popular: props.popular }));
const query = computed(() => value.value.trim());
const rows = computed<Row[]>(() => [
  ...suggestions.value.map((s) => ({ key: s.id, suggestion: s })),
  ...(query.value ? [{ key: "submit", suggestion: null, submit: true }] : []),
]);
const showList = computed(() => open.value && rows.value.length > 0);
watch([value, open], () => (active.value = -1));

const setValue = (v: string) => {
  innerValue.value = v;
  emit("update:modelValue", v);
};
const setRecent = (next: string[]) => {
  innerRecent.value = next;
  emit("update:recent", next);
};
const remember = (q: string) => setRecent(chromeRecordRecent(recent.value, q));
function run(q: string) {
  const text = q.trim();
  if (!text) return;
  remember(text);
  setValue(text);
  open.value = false;
  props.onSearch?.(text);
  emit("search", text);
}
function choose(row: Row) {
  const s = row.suggestion;
  if (!s || row.submit) return run(value.value);
  if (s.kind === "product") {
    const p = props.products.find((x) => x.id === s.productId);
    if (p && props.onSelectProduct) {
      remember(query.value || s.label);
      open.value = false;
      setValue("");
      props.onSelectProduct(p);
      return;
    }
  }
  if (s.kind === "category" && s.categoryId && props.onSelectCategory) {
    open.value = false;
    setValue("");
    props.onSelectCategory(s.categoryId, s.label);
    return;
  }
  run(s.query);
}

function onKeyDown(event: KeyboardEvent) {
  const k = event.key;
  if (k === "ArrowDown" || k === "ArrowUp" || k === "Home" || k === "End") {
    if (!rows.value.length) return;
    if ((k === "Home" || k === "End") && !showList.value) return;
    event.preventDefault();
    open.value = true;
    active.value = chromeMoveActive(active.value, rows.value.length, k);
  } else if (k === "Enter") {
    event.preventDefault();
    const row = showList.value ? rows.value[active.value] : undefined;
    if (row) choose(row);
    else run(value.value);
  } else if (k === "Escape") {
    if (showList.value) {
      event.preventDefault();
      event.stopPropagation();
      open.value = false;
    } else if (value.value) setValue("");
  }
}
function onBlur(e: FocusEvent) {
  if (!root.value?.contains(e.relatedTarget as Node | null)) open.value = false;
}
function clear() {
  setValue("");
  (input.value?.$el as HTMLInputElement | undefined)?.focus();
}

const groups = computed(() => [
  { kind: "category" as const, title: t.value.categoriesGroup },
  { kind: "product" as const, title: t.value.productsGroup },
  { kind: "recent" as const, title: t.value.recentGroup },
  { kind: "popular" as const, title: t.value.popularGroup },
]);
const itemsOf = (kind: ChromeSuggestion["kind"]) => rows.value.map((r, i) => ({ r, i })).filter(({ r }) => r.suggestion?.kind === kind);
const productOf = (s: ChromeSuggestion) => (s.kind === "product" ? props.products.find((p) => p.id === s.productId) : undefined);

// The text of a row with the matching part emphasised.
const Highlight = (p: { text: string }) =>
  chromeHighlight(p.text, query.value).map((s, i) => (s.match ? h("mark", { key: i, class: "bg-transparent font-semibold text-foreground" }, s.text) : h("span", { key: i }, s.text)));
</script>

<template>
  <div ref="root" data-slot="store-search" :class="cn('relative w-full', props.class)" @focusout="onBlur">
    <form role="search" :aria-label="t.searchLabel" @submit.prevent="run(value)">
      <NqInputGroup>
        <NqInputGroupAddon>
          <Loader2 v-if="props.loading" aria-hidden="true" class="size-4 animate-spin motion-reduce:animate-none" />
          <Search v-else aria-hidden="true" class="size-4" />
        </NqInputGroupAddon>
        <NqInputGroupInput
          ref="input"
          type="search"
          role="combobox"
          :aria-expanded="showList"
          :aria-controls="listId"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          :aria-label="t.searchLabel"
          :aria-activedescendant="showList && active >= 0 ? `${uid}-opt-${active}` : undefined"
          autocomplete="off"
          enterkeyhint="search"
          :placeholder="props.placeholder ?? t.searchPlaceholder"
          :model-value="value"
          class="[&::-webkit-search-cancel-button]:hidden"
          @update:model-value="(v: string | number | undefined) => { setValue(String(v ?? '')); open = true; }"
          @focus="open = true"
          @click="open = true"
          @keydown="onKeyDown"
        />
        <NqInputGroupAddon v-if="value" align="end">
          <button type="button" :aria-label="t.clearSearch" class="inline-flex size-6 items-center justify-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus" @click="clear">
            <X aria-hidden="true" class="size-4" />
          </button>
        </NqInputGroupAddon>
      </NqInputGroup>
    </form>
    <p role="status" aria-live="polite" class="sr-only">{{ showList ? storeChromeFill(t.suggestionsCount, { n: fmt(suggestions.length) }) : "" }}</p>

    <div
      v-if="showList"
      data-slot="store-search-popup"
      class="absolute inset-x-0 top-full z-40 mt-1.5 max-h-[min(28rem,70dvh)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating"
      @mousedown.prevent
    >
      <ul :id="listId" role="listbox" :aria-label="t.suggestions" class="m-0 flex list-none flex-col p-0">
        <template v-for="g in groups" :key="g.kind">
          <template v-if="itemsOf(g.kind).length">
            <li role="presentation" class="flex items-center justify-between px-2.5 pt-2 pb-1 text-caption font-medium text-muted-foreground">
              {{ g.title }}
              <button
                v-if="g.kind === 'recent' && !query"
                type="button"
                class="rounded-sm text-caption outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
                @click="setRecent([])"
              >
                {{ t.clearRecent }}
              </button>
            </li>
            <li
              v-for="{ r, i } in itemsOf(g.kind)"
              :id="`${uid}-opt-${i}`"
              :key="r.key"
              role="option"
              :aria-selected="i === active"
              :data-active="i === active ? '' : undefined"
              :class="cn('flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-1.5 text-body-sm', i === active && 'bg-nq-selected')"
              @mousemove="active = i"
              @click.prevent="choose(r)"
            >
              <template v-if="productOf(r.suggestion!)">
                <span class="size-10 shrink-0 overflow-hidden rounded-control bg-secondary">
                  <NqStoreProductImage :src="productOf(r.suggestion!)!.images[0]?.src" alt="" />
                </span>
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="truncate text-foreground">
                    <a v-if="props.getProductHref" :href="props.getProductHref(productOf(r.suggestion!)!)" tabindex="-1" class="text-inherit no-underline" @click.prevent>
                      <Highlight :text="productOf(r.suggestion!)!.name" />
                    </a>
                    <Highlight v-else :text="productOf(r.suggestion!)!.name" />
                  </span>
                  <span v-if="productOf(r.suggestion!)!.brand" class="truncate text-caption text-muted-foreground">{{ productOf(r.suggestion!)!.brand }}</span>
                </span>
                <NqStorePrice v-if="props.currency" :amount="listingMinPrice(productOf(r.suggestion!)!)" :currency="props.currency" size="sm" />
              </template>
              <template v-else>
                <span aria-hidden="true" class="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground">
                  <Clock v-if="r.suggestion!.kind === 'recent'" class="size-4" />
                  <TrendingUp v-else-if="r.suggestion!.kind === 'popular'" class="size-4" />
                  <Search v-else class="size-4" />
                </span>
                <span class="min-w-0 flex-1 truncate"><Highlight :text="r.suggestion!.label" /></span>
                <span v-if="r.suggestion!.kind === 'category' && r.suggestion!.path && r.suggestion!.path !== r.suggestion!.label" class="truncate text-caption text-muted-foreground">
                  {{ storeChromeFill(t.inCategory, { category: r.suggestion!.path!.split(" / ").slice(0, -1).join(" / ") }) }}
                </span>
              </template>
            </li>
          </template>
        </template>
        <li
          v-if="rows.some((r) => r.submit)"
          :id="`${uid}-opt-${rows.length - 1}`"
          role="option"
          :aria-selected="active === rows.length - 1"
          :class="cn('mt-1 flex cursor-pointer items-center gap-2 rounded-control border-t border-border px-2.5 py-2 text-body-sm', active === rows.length - 1 && 'bg-nq-selected')"
          @mousemove="active = rows.length - 1"
          @click="run(value)"
        >
          <Search aria-hidden="true" class="size-4 text-muted-foreground" />
          <bdi>{{ storeChromeFill(t.searchFor, { query }) }}</bdi>
        </li>
        <li v-if="query && !suggestions.length" role="presentation" class="px-2.5 py-2 text-body-sm text-muted-foreground">
          {{ storeChromeFill(t.noSuggestions, { query }) }}
        </li>
      </ul>
    </div>
  </div>
</template>
