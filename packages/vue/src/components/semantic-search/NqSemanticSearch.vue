<script setup lang="ts">
import { Check, Copy, Search, SlidersHorizontal, Sparkles, Star, X } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqInput } from "../field";
import { formatNumber, type FormatNumberOptions } from "../numeric";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import {
  EMPTY_FACETS,
  SEMANTIC_FACET_FIELDS,
  clamp01,
  facetValues,
  filterHits,
  hasFacetFilters,
  highlightParts,
  scoreLevel,
  toggleInSet,
  type SemanticFacetField,
  type SemanticFacetSelection,
} from "./semantic-search-math";
import { STRINGS, type SemanticSearchLabelOverrides } from "./strings";
import type { SemanticHit, SemanticSearchOptions } from "./types";

// A search box for a knowledge base with ranked results. Each hit shows its match text with the query words marked, where it came
// from and a similarity score. Facet chips (group, type, source, high importance) narrow the hits on the client.
interface Props {
  /** The hits of the last search. Facets are built from these. */
  results?: readonly SemanticHit[];
  searching?: boolean;
  error?: string;
  /** Run a search. Set `results` when it finishes. */
  onSearch: (query: string, options: SemanticSearchOptions) => void | Promise<void>;
  /** Open a hit. Adds the "Open" button and the context menu item. */
  onOpen?: (hit: SemanticHit) => void;
  /** Search modes. Default `semantic` and `keyword`. Pass an empty array to hide the switch. */
  modes?: readonly { id: string; label?: string }[];
  defaultMode?: string;
  /** Result limits offered. Default 10, 20, 50. */
  limits?: readonly number[];
  defaultLimit?: number;
  defaultQuery?: string;
  showScores?: boolean;
  contextMenu?: boolean;
  labels?: SemanticSearchLabelOverrides;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  results: undefined,
  searching: false,
  error: undefined,
  onOpen: undefined,
  modes: () => [{ id: "semantic" }, { id: "keyword" }],
  defaultMode: undefined,
  limits: () => [10, 20, 50],
  defaultLimit: undefined,
  defaultQuery: "",
  showScores: true,
  contextMenu: true,
  labels: undefined,
});
const emit = defineEmits<{ retry: [] }>();
defineOptions({ inheritAttrs: false });

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => {
  const base = STRINGS[locale.value.startsWith("ar") ? "ar" : "en"];
  return {
    ...base,
    ...props.labels,
    modes: { ...base.modes, ...props.labels?.modes },
    fields: { ...base.fields, ...props.labels?.fields },
    levels: { ...base.levels, ...props.labels?.levels },
  };
});
const num = (n: number, o?: FormatNumberOptions) => formatNumber(n, locale.value, o);
const fig = (n: number) => num(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const query = ref(props.defaultQuery);
const asked = ref<string | null>(null);
const mode = ref(props.defaultMode ?? props.modes[0]?.id ?? "semantic");
const limit = ref(props.defaultLimit ?? props.limits[0] ?? 10);
const facets = ref<SemanticFacetSelection>(EMPTY_FACETS);
const high = ref(false);
const copied = ref<string | null>(null);

const raw = computed(() => props.results ?? []);
const facetLists = computed(() => SEMANTIC_FACET_FIELDS.map((f) => [f, facetValues(raw.value, f)] as const));
const shown = computed(() => filterHits(raw.value, facets.value, high.value));
const filtered = computed(() => hasFacetFilters(facets.value, high.value));
const ran = computed(() => asked.value !== null);

function clear() {
  facets.value = EMPTY_FACETS;
  high.value = false;
}
function toggleFacet(field: SemanticFacetField, value: string) {
  facets.value = { ...facets.value, [field]: toggleInSet(facets.value[field], value) };
}
function submit() {
  const q = query.value.trim();
  if (!q || props.searching) return;
  clear();
  asked.value = q;
  void props.onSearch(q, { mode: mode.value, limit: limit.value });
}
async function copy(hit: SemanticHit) {
  try {
    await navigator.clipboard?.writeText(hit.content);
  } catch {
    /* clipboard can be blocked; the label still confirms the intent */
  }
  copied.value = hit.id;
  setTimeout(() => {
    if (copied.value === hit.id) copied.value = null;
  }, 1600);
}
const actionsFor = (hit: SemanticHit): ContextMenuAction[] => [
  ...(props.onOpen ? [{ id: "open", label: t.value.open, icon: Search, onSelect: () => props.onOpen?.(hit) }] : []),
  { id: "copy", label: t.value.copy, icon: Copy, onSelect: () => void copy(hit) },
];
</script>

<template>
  <section data-slot="semantic-search" :aria-label="t.label" :class="cn('flex min-w-0 flex-col gap-4', props.class)" v-bind="$attrs">
    <form class="flex flex-col gap-3" role="search" @submit.prevent="submit">
      <div v-if="props.modes.length > 0 || props.limits.length > 1" class="flex flex-wrap items-center gap-2">
        <div v-if="props.modes.length > 0" role="group" :aria-label="t.mode" class="flex flex-wrap items-center gap-1.5">
          <NqButton
            v-for="(m, i) in props.modes"
            :key="m.id"
            type="button"
            size="sm"
            :variant="mode === m.id ? 'primary' : 'secondary'"
            :aria-pressed="mode === m.id"
            @click="mode = m.id"
          >
            <Sparkles v-if="i === 0" aria-hidden="true" />
            <Search v-else aria-hidden="true" />
            {{ m.label ?? t.modes[m.id] ?? m.id }}
          </NqButton>
        </div>
        <div v-if="props.limits.length > 1" role="group" :aria-label="t.limit" class="ms-auto flex items-center gap-1.5">
          <span class="text-caption text-muted-foreground">{{ t.limit }}</span>
          <NqButton
            v-for="n in props.limits"
            :key="n"
            type="button"
            size="sm"
            :variant="limit === n ? 'primary' : 'ghost'"
            :aria-pressed="limit === n"
            class="h-7 px-2 tabular-nums"
            @click="limit = n"
          >
            {{ num(n) }}
          </NqButton>
        </div>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row">
        <div class="relative min-w-0 flex-1">
          <Search aria-hidden="true" class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <NqInput v-model="query" dir="auto" :placeholder="t.placeholder" :aria-label="t.placeholder" class="ps-9" />
        </div>
        <NqButton type="submit" variant="primary" :loading="props.searching" :disabled="!query.trim()">{{ props.searching ? t.searching : t.search }}</NqButton>
      </div>
    </form>

    <div v-if="raw.length > 0 && !props.searching" class="flex flex-wrap items-center gap-1.5" role="group" :aria-label="t.tune">
      <span class="me-1 inline-flex items-center gap-1.5 text-caption text-muted-foreground">
        <SlidersHorizontal aria-hidden="true" class="size-3.5" />
        {{ t.tune }}
      </span>
      <template v-for="[field, values] in facetLists" :key="field">
        <span v-if="values.length > 0" role="group" :aria-label="t.fields[field]" class="flex flex-wrap items-center gap-1.5 border-s border-border ps-2 first:border-s-0 first:ps-0">
          <NqButton
            v-for="{ value } in values"
            :key="value"
            type="button"
            size="sm"
            :variant="facets[field].has(value) ? 'primary' : 'secondary'"
            :aria-pressed="facets[field].has(value)"
            class="h-7 px-2.5 text-caption"
            @click="toggleFacet(field, value)"
          >
            <Check v-if="facets[field].has(value)" aria-hidden="true" />
            <bdi dir="ltr" class="font-mono text-[12px]">{{ value }}</bdi>
          </NqButton>
        </span>
      </template>
      <span v-if="raw.some((h) => h.importance !== undefined)" class="border-s border-border ps-2">
        <NqButton type="button" size="sm" :variant="high ? 'primary' : 'secondary'" :aria-pressed="high" class="h-7 px-2.5 text-caption" @click="high = !high">
          <Check v-if="high" aria-hidden="true" />
          <Star v-else aria-hidden="true" />
          {{ t.highImportance }}
        </NqButton>
      </span>
      <NqButton v-if="filtered" type="button" size="sm" variant="ghost" class="ms-auto h-7" @click="clear">
        <X aria-hidden="true" />
        {{ t.clear }}
      </NqButton>
    </div>

    <div v-if="props.searching" role="status" aria-live="polite" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <span class="sr-only">{{ t.loading }}</span>
      <div v-for="i in 3" :key="i" class="flex flex-col gap-2">
        <NqSkeleton class="h-4 w-3/4" />
        <NqSkeleton class="h-3 w-1/3" />
      </div>
    </div>
    <NqErrorState v-else-if="props.error" :title="props.error">
      <template v-if="$attrs.onRetry" #actions><NqButton @click="emit('retry')">{{ t.retry }}</NqButton></template>
    </NqErrorState>
    <p v-else-if="!ran && raw.length === 0" class="py-6 text-center text-body-sm text-muted-foreground">{{ t.idle }}</p>
    <NqEmptyState v-else-if="raw.length === 0" :icon="Search" :title="t.none(asked ?? query)" :description="t.noneHint" />
    <p v-else-if="shown.length === 0" class="py-6 text-center text-body-sm text-muted-foreground">{{ t.allFiltered(num(raw.length)) }}</p>
    <div v-else class="flex flex-col gap-2">
      <p role="status" aria-live="polite" class="text-caption text-muted-foreground">
        {{ filtered ? t.countOf(num(shown.length), num(raw.length)) : shown.length === 1 ? t.countOne : t.countMany(num(shown.length)) }}
      </p>
      <ol class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        <NqContextMenuActions v-for="hit in shown" :key="hit.id" as="li" :actions="props.contextMenu ? actionsFor(hit) : []" class="flex flex-col gap-2 px-4 py-3">
          <div class="flex items-start gap-3">
            <p dir="auto" class="line-clamp-4 min-w-0 flex-1 whitespace-pre-wrap text-body text-foreground">
              <template v-for="(part, i) in highlightParts(hit.content, asked ?? query)" :key="i">
                <mark v-if="part.match" class="rounded-[3px] bg-nq-accent/20 px-0.5 text-inherit">{{ part.text }}</mark>
                <span v-else>{{ part.text }}</span>
              </template>
            </p>
            <NqButton v-if="props.onOpen" size="sm" class="shrink-0" @click="props.onOpen(hit)">{{ t.open }}</NqButton>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground">
            <NqBadge v-if="hit.group || hit.kind" variant="outline" dir="ltr" class="font-mono">{{ [hit.group, hit.kind].filter(Boolean).join(" · ") }}</NqBadge>
            <bdi v-if="hit.source" dir="ltr" class="max-w-56 truncate font-mono">{{ hit.source }}{{ hit.sourceRef ? ` · ${hit.sourceRef}` : "" }}</bdi>
            <span v-if="hit.viaEntity" class="text-nq-accent-text">{{ t.via(hit.viaEntity) }}</span>
            <span class="ms-auto flex flex-wrap items-center gap-3">
              <span v-if="copied === hit.id" role="status">{{ t.copied }}</span>
              <span v-if="props.showScores" class="inline-flex items-center gap-2" :title="t.scoreTitle(fig(clamp01(hit.score)))">
                <span class="sr-only">{{ t.score }}</span>
                <span aria-hidden="true" class="block h-1 w-12 overflow-hidden rounded-full bg-nq-surface-soft">
                  <span :class="cn('block h-full rounded-full', scoreLevel(clamp01(hit.score)) === 'weak' ? 'bg-nq-line-strong' : 'bg-nq-accent')" :style="{ width: `${clamp01(hit.score) * 100}%` }" />
                </span>
                <bdi dir="ltr" class="tabular-nums">{{ fig(clamp01(hit.score)) }}</bdi>
                <span>{{ t.levels[scoreLevel(clamp01(hit.score))] }}</span>
              </span>
              <span v-if="hit.importance !== undefined">{{ t.importance(fig(clamp01(hit.importance))) }}</span>
            </span>
          </div>
        </NqContextMenuActions>
      </ol>
    </div>
  </section>
</template>
