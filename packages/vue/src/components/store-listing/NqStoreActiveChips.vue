<script setup lang="ts">
import { X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { useFormatNumber } from "../numeric";
import { storeChipLabel, useStoreMoney } from "./chip-label";
import type { CommerceListingFilters } from "./commerce";
import { listingActiveChips, listingClear, listingRemoveChip, type ListingLabelIndex } from "./listing-model";
import { fillTemplate, useListingStrings, type ListingLabels } from "./listing-strings";

// One removable chip per applied filter, and "Clear all".
interface Props {
  /** v-model:filters. */
  filters: CommerceListingFilters;
  index: ListingLabelIndex;
  /** Default USD, or SAR in Arabic. */
  currency?: string;
  /** Show the query chip. Default false (the search page shows the query in its heading). */
  includeQuery?: boolean;
  labels?: ListingLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, includeQuery: false, labels: undefined });
const emit = defineEmits<{ "update:filters": [filters: CommerceListingFilters] }>();
const currency = useCurrency(() => props.currency);
const { t } = useListingStrings(() => props.labels);
const fmt = useFormatNumber();
const money = useStoreMoney(() => currency.value);
const chips = computed(() => listingActiveChips(props.filters).filter((c) => props.includeQuery || c.kind !== "query"));
const labelOf = (chip: (typeof chips.value)[number]) => storeChipLabel(chip, props.index, t.value, money.value, fmt);
</script>

<template>
  <div v-if="chips.length" data-slot="store-active-chips" role="group" :aria-label="t.activeFilters" :class="cn('flex flex-wrap items-center gap-2', props.class)">
    <button
      v-for="chip in chips"
      :key="chip.id"
      type="button"
      :aria-label="fillTemplate(t.removeFilter, { label: labelOf(chip) })"
      class="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card ps-3 pe-2 text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
      @click="emit('update:filters', listingRemoveChip(props.filters, chip))"
    >
      <bdi>{{ labelOf(chip) }}</bdi>
      <X aria-hidden="true" class="size-3.5 text-muted-foreground" />
    </button>
    <NqButton variant="link" size="sm" @click="emit('update:filters', listingClear(props.filters, !props.includeQuery))">{{ t.clearAll }}</NqButton>
  </div>
</template>
