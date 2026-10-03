<script setup lang="ts">
import { getCurrentInstance } from "vue";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogTitle } from "../dialog";
import type { CommerceProduct } from "./commerce";
import { useListingStrings, type ListingLabels } from "./listing-strings";
import NqStoreCompareTable from "./NqStoreCompareTable.vue";

// The compare table in a wide dialog.
interface Props {
  /** v-model:open. */
  open: boolean;
  products: readonly CommerceProduct[];
  currency?: string;
  differencesOnly?: boolean;
  labels?: ListingLabels;
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, differencesOnly: false, labels: undefined });
const emit = defineEmits<{ "update:open": [open: boolean]; remove: [product: CommerceProduct]; addToCart: [product: CommerceProduct] }>();
const instance = getCurrentInstance();
const bound = (name: string) => Boolean((instance?.vnode.props as Record<string, unknown> | null | undefined)?.[name]);
const { t } = useListingStrings(() => props.labels);
</script>

<template>
  <NqDialog :open="props.open" @update:open="emit('update:open', $event)">
    <NqDialogContent data-slot="store-compare-dialog" :close-label="t.close" class="max-w-5xl">
      <div class="flex flex-col gap-1 pe-8">
        <NqDialogTitle>{{ t.compareTitle }}</NqDialogTitle>
        <NqDialogDescription>{{ t.compareDescription }}</NqDialogDescription>
      </div>
      <NqStoreCompareTable
        :products="props.products"
        :currency="props.currency"
        :differences-only="props.differencesOnly"
        :labels="props.labels"
        v-bind="{ ...(bound('onRemove') ? { onRemove: (p: CommerceProduct) => emit('remove', p) } : {}), ...(bound('onAddToCart') ? { onAddToCart: (p: CommerceProduct) => emit('addToCart', p) } : {}) }"
      />
    </NqDialogContent>
  </NqDialog>
</template>
