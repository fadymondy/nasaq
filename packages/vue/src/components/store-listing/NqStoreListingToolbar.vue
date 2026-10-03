<script setup lang="ts">
import { LayoutGrid, List, SlidersHorizontal } from "lucide-vue-next";
import { computed, getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { useFormatNumber } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { COMMERCE_LISTING_SORTS, type CommerceListingSort } from "./commerce";
import { fillTemplate, useListingStrings, type ListingLabels } from "./listing-strings";

export type StoreListingView = "grid" | "list";
export type StoreListingDensity = "comfortable" | "compact";

// Result count, sort, grid/list toggle, density and the mobile Filters button (shown when an `open-filters` listener is bound).
interface Props {
  total: number;
  /** v-model:sort. */
  sort: CommerceListingSort;
  /** Sorts on offer. Default all of them. */
  sorts?: readonly CommerceListingSort[];
  /** v-model:view. */
  view: StoreListingView;
  /** v-model:density. */
  density: StoreListingDensity;
  /** Filter count for the mobile button. */
  filterCount?: number;
  labels?: ListingLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { sorts: () => COMMERCE_LISTING_SORTS, filterCount: 0, labels: undefined });
const emit = defineEmits<{
  "update:sort": [sort: CommerceListingSort];
  "update:view": [view: StoreListingView];
  "update:density": [density: StoreListingDensity];
  openFilters: [];
}>();
const instance = getCurrentInstance();
const hasFilters = computed(() => Boolean((instance?.vnode.props as Record<string, unknown> | null | undefined)?.onOpenFilters));
const { t } = useListingStrings(() => props.labels);
const fmt = useFormatNumber();
const items = computed(() => props.sorts.map((s) => ({ value: s, label: t.value.sort[s] })));
</script>

<template>
  <div data-slot="store-listing-toolbar" :class="cn('flex flex-wrap items-center gap-x-3 gap-y-2', props.class)">
    <NqButton v-if="hasFilters" variant="secondary" size="sm" class="lg:hidden" @click="emit('openFilters')">
      <NqIcon :icon="SlidersHorizontal" />
      {{ props.filterCount ? fillTemplate(t.filtersCount, { n: fmt(props.filterCount) }) : t.filters }}
    </NqButton>
    <p role="status" aria-live="polite" class="me-auto text-body-sm text-muted-foreground">{{ props.total === 1 ? t.resultsOne : fillTemplate(t.results, { n: fmt(props.total) }) }}</p>
    <label class="flex items-center gap-2 text-body-sm text-muted-foreground">
      <span class="hidden sm:inline">{{ t.sortBy }}</span>
      <NqSelect :model-value="props.sort" @update:model-value="(v) => v && emit('update:sort', v as CommerceListingSort)">
        <NqSelectTrigger :aria-label="t.sortBy" class="h-8 w-auto min-w-40"><NqSelectValue /></NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="i in items" :key="i.value" :value="i.value">{{ i.label }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
    </label>
    <NqToggleGroup :aria-label="t.view" :model-value="[props.view]" @update:model-value="(v) => v[0] && emit('update:view', v[0] as StoreListingView)">
      <NqToggle value="grid" :aria-label="t.grid"><NqIcon :icon="LayoutGrid" /></NqToggle>
      <NqToggle value="list" :aria-label="t.list"><NqIcon :icon="List" /></NqToggle>
    </NqToggleGroup>
    <NqToggleGroup v-if="props.view === 'grid'" :aria-label="t.density" class="hidden sm:flex" :model-value="[props.density]" @update:model-value="(v) => v[0] && emit('update:density', v[0] as StoreListingDensity)">
      <NqToggle value="comfortable">{{ t.comfortable }}</NqToggle>
      <NqToggle value="compact">{{ t.compact }}</NqToggle>
    </NqToggleGroup>
  </div>
</template>
