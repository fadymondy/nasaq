<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqButton } from "../button";
import { useFormatNumber } from "../numeric";
import { NqSheet, NqSheetBody, NqSheetContent, NqSheetDescription, NqSheetFooter, NqSheetHeader, NqSheetTitle } from "../sheet";
import type { CommerceCategoryNode, CommerceListingFilters, CommerceProduct } from "./commerce";
import { listingClear, listingFilter } from "./listing-model";
import { fillTemplate, useListingStrings, type ListingLabels } from "./listing-strings";
import NqStoreFacetSidebar from "./NqStoreFacetSidebar.vue";

// The facets in a bottom sheet. Changes are held in a draft and only apply with the button, which shows the live result count.
interface Props {
  /** v-model:open. */
  open: boolean;
  products: readonly CommerceProduct[];
  filters: CommerceListingFilters;
  categoryTree?: readonly CommerceCategoryNode[];
  currency?: string;
  optionIds?: readonly string[];
  labels?: ListingLabels;
}
const props = withDefaults(defineProps<Props>(), { categoryTree: () => [], currency: undefined, optionIds: undefined, labels: undefined });
const emit = defineEmits<{ "update:open": [open: boolean]; apply: [filters: CommerceListingFilters] }>();
const { t } = useListingStrings(() => props.labels);
const fmt = useFormatNumber();
const draft = ref<CommerceListingFilters>(props.filters);
watch(
  () => props.open,
  (o) => o && (draft.value = props.filters),
);
const count = computed(() => listingFilter(props.products, draft.value, { tree: props.categoryTree }).length);
function apply() {
  emit("apply", draft.value);
  emit("update:open", false);
}
</script>

<template>
  <NqSheet :open="props.open" @update:open="emit('update:open', $event)">
    <NqSheetContent side="bottom" :close-label="t.close" class="max-h-[90dvh]">
      <NqSheetHeader>
        <NqSheetTitle>{{ t.filters }}</NqSheetTitle>
        <NqSheetDescription class="sr-only">{{ t.facets }}</NqSheetDescription>
      </NqSheetHeader>
      <NqSheetBody>
        <NqStoreFacetSidebar v-model:filters="draft" :products="props.products" :category-tree="props.categoryTree" :currency="props.currency" :option-ids="props.optionIds" :labels="props.labels" />
      </NqSheetBody>
      <NqSheetFooter class="flex-row gap-2">
        <NqButton variant="secondary" class="flex-1" @click="draft = listingClear(draft, true)">{{ t.clearAll }}</NqButton>
        <NqButton variant="primary" class="flex-[2]" :disabled="count === 0" @click="apply">{{ count === 0 ? t.applyNone : fillTemplate(t.apply, { n: fmt(count) }) }}</NqButton>
      </NqSheetFooter>
    </NqSheetContent>
  </NqSheet>
</template>
