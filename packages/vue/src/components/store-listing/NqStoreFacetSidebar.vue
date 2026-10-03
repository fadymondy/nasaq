<script setup lang="ts">
import { Star } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqCheckbox } from "../checkbox";
import { useFormatNumber } from "../numeric";
import { NqSlider } from "../slider";
import type { CommerceCategoryNode, CommerceListingFilters, CommerceProduct } from "./commerce";
import { listingFacets, listingLabelIndex, listingToMajor, listingToMinor, listingToggleOption, listingToggleValue } from "./listing-model";
import { currencyDigits, fillTemplate, useListingStrings, type ListingLabels } from "./listing-strings";
import NqStoreCategoryTree from "./NqStoreCategoryTree.vue";
import NqStoreCheckList from "./NqStoreCheckList.vue";
import NqStoreFacetGroup from "./NqStoreFacetGroup.vue";

// The filter column: category tree, price slider, brand, options (colour swatches, sizes), rating, availability and
// on sale. Counts are disjunctive: a group counts what each value would give if picked, ignoring that group's own picks.
interface Props {
  /** The catalogue the facets count over (all products, before filtering). */
  products: readonly CommerceProduct[];
  /** v-model:filters. */
  filters: CommerceListingFilters;
  categoryTree?: readonly CommerceCategoryNode[];
  /** ISO 4217 code for the price slider. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Options to offer, by option id. Default: every option in the catalogue. */
  optionIds?: readonly string[];
  labels?: ListingLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { categoryTree: () => [], currency: undefined, optionIds: undefined, labels: undefined });
const emit = defineEmits<{ "update:filters": [filters: CommerceListingFilters] }>();

const currency = useCurrency(() => props.currency);
const { t } = useListingStrings(() => props.labels);
const fmt = useFormatNumber();
const index = computed(() => listingLabelIndex(props.products, props.categoryTree));
const facets = computed(() => listingFacets(props.products, props.filters, props.categoryTree, index.value));
const digits = computed(() => currencyDigits(currency.value));
const lo = computed(() => Math.floor(listingToMajor(facets.value.price.min, digits.value)));
const hi = computed(() => Math.ceil(listingToMajor(facets.value.price.max, digits.value)));
const applied = computed<[number, number]>(() =>
  props.filters.price ? [listingToMajor(props.filters.price[0], digits.value), listingToMajor(props.filters.price[1], digits.value)] : [lo.value, hi.value],
);
const draft = ref<number[]>([...applied.value]);
watch(applied, (a) => (draft.value = [...a]));
const set = (patch: Partial<CommerceListingFilters>) => emit("update:filters", { ...props.filters, ...patch });
const options = computed(() => facets.value.options.filter((o) => !props.optionIds || props.optionIds.includes(o.id)));
const commitPrice = (v: number[]) =>
  set({ price: v[0]! <= lo.value && v[1]! >= hi.value ? null : [listingToMinor(v[0]!, digits.value), listingToMinor(v[1]!, digits.value)] });
const row = "rounded-control px-2 py-1 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus";
</script>

<template>
  <div data-slot="store-facet-sidebar" role="group" :aria-label="t.facets" :class="cn('flex flex-col', props.class)">
    <NqStoreFacetGroup v-if="facets.categories.length" :title="t.categories">
      <button type="button" :aria-current="props.filters.category === null ? 'true' : undefined" :class="cn('mb-0.5 w-full', row, props.filters.category === null ? 'bg-nq-selected font-medium' : 'text-muted-foreground')" @click="set({ category: null })">
        {{ t.allCategories }}
      </button>
      <NqStoreCategoryTree :nodes="facets.categories" @select="set({ category: $event })" />
    </NqStoreFacetGroup>

    <NqStoreFacetGroup v-if="hi > lo" :title="t.price">
      <div class="px-2">
        <NqSlider
          v-model="draft"
          :aria-label="t.price"
          :min="lo"
          :max="hi"
          :step="Math.max(1, Math.round((hi - lo) / 50))"
          :thumb-labels="[t.priceMin, t.priceMax]"
          :format="{ style: 'currency', currency, maximumFractionDigits: 0 }"
          show-value
          @value-commit="commitPrice"
        />
      </div>
    </NqStoreFacetGroup>

    <NqStoreFacetGroup v-if="facets.brands.length > 1" :title="t.brand">
      <NqStoreCheckList :values="facets.brands" :labels="props.labels" @toggle="set({ brands: listingToggleValue(props.filters.brands, $event) })" />
    </NqStoreFacetGroup>

    <NqStoreFacetGroup v-for="o in options" :key="o.id" :title="o.name">
      <div v-if="o.display === 'swatch' || o.display === 'image'" role="group" :aria-label="o.name" class="flex flex-wrap gap-2">
        <button
          v-for="v in o.values"
          :key="v.id"
          type="button"
          :aria-pressed="v.selected"
          :aria-label="`${v.label} (${fmt(v.count)})`"
          :title="`${v.label} (${fmt(v.count)})`"
          :disabled="v.count === 0 && !v.selected"
          :style="v.color ? { backgroundColor: v.color } : undefined"
          :class="cn('size-7 rounded-full border border-nq-line-strong outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-35', v.selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background')"
          @click="emit('update:filters', listingToggleOption(props.filters, o.id, v.id))"
        />
      </div>
      <div v-else role="group" :aria-label="o.name" class="flex flex-wrap gap-1.5">
        <button
          v-for="v in o.values"
          :key="v.id"
          type="button"
          :aria-pressed="v.selected"
          :disabled="v.count === 0 && !v.selected"
          :class="cn('h-8 min-w-10 rounded-control border px-2.5 text-label outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-40', v.selected ? 'border-primary bg-nq-selected text-foreground' : 'border-border bg-card text-foreground hover:bg-nq-hover')"
          @click="emit('update:filters', listingToggleOption(props.filters, o.id, v.id))"
        >
          <bdi>{{ v.label }}</bdi>
        </button>
      </div>
    </NqStoreFacetGroup>

    <NqStoreFacetGroup :title="t.rating">
      <div role="radiogroup" :aria-label="t.rating" class="flex flex-col gap-0.5">
        <button
          v-for="r in facets.ratings"
          :key="r.min"
          type="button"
          role="radio"
          :aria-checked="r.selected"
          :class="cn('flex items-center justify-between gap-2', row, r.selected && 'bg-nq-selected font-medium')"
          @click="set({ minRating: r.selected ? null : r.min })"
        >
          <span class="inline-flex items-center gap-1.5">
            <Star aria-hidden="true" class="size-3.5 fill-nq-accent text-nq-accent" />
            {{ fillTemplate(t.andUp, { n: fmt(r.min) }) }}
          </span>
          <bdi class="tabular-nums text-caption text-muted-foreground">{{ fmt(r.count) }}</bdi>
        </button>
      </div>
    </NqStoreFacetGroup>

    <NqStoreFacetGroup :title="t.availability">
      <ul class="flex flex-col gap-1.5">
        <li>
          <label class="flex cursor-pointer items-center gap-2 text-body-sm">
            <NqCheckbox :model-value="props.filters.inStock" @update:model-value="set({ inStock: $event })" />
            <span class="flex-1">{{ t.inStock }}</span>
            <bdi class="tabular-nums text-caption text-muted-foreground">{{ fmt(facets.inStock) }}</bdi>
          </label>
        </li>
        <li>
          <label class="flex cursor-pointer items-center gap-2 text-body-sm">
            <NqCheckbox :model-value="props.filters.onSale" @update:model-value="set({ onSale: $event })" />
            <span class="flex-1">{{ t.onSale }}</span>
            <bdi class="tabular-nums text-caption text-muted-foreground">{{ fmt(facets.onSale) }}</bdi>
          </label>
        </li>
      </ul>
    </NqStoreFacetGroup>
  </div>
</template>
