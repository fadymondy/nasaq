<script setup lang="ts">
import { computed } from "vue";
import { NqBadge } from "../badge";
import { NqCheckbox } from "../checkbox";
import type { CommerceProduct } from "./commerce";
import type { DiscountScope } from "./discount-logic";
import type { StoreSettingsLabels } from "./strings";
import type { SimCollection } from "./types";
import { useSettingsStrings } from "./use-settings";

// Which products and collections a discount applies to. Internal to the discount editor.
const props = defineProps<{ value: DiscountScope | undefined; products: readonly CommerceProduct[]; collections: readonly SimCollection[]; labels?: StoreSettingsLabels; emptyLabel?: string }>();
const emit = defineEmits<{ change: [scope: DiscountScope | undefined] }>();
const { t } = useSettingsStrings(() => props.labels);
const productIds = computed(() => props.value?.productIds ?? []);
const collectionIds = computed(() => props.value?.collectionIds ?? []);
const hasScope = (s?: DiscountScope) => (s?.productIds?.length ?? 0) > 0 || (s?.collectionIds?.length ?? 0) > 0;
const all = computed(() => !hasScope(props.value));

function toggle(key: "productIds" | "collectionIds", id: string, on: boolean) {
  const cur = key === "productIds" ? productIds.value : collectionIds.value;
  const next = on ? [...cur, id] : cur.filter((x) => x !== id);
  const scope: DiscountScope = { productIds: productIds.value, collectionIds: collectionIds.value, [key]: next };
  if (scope.productIds?.length === 0) delete scope.productIds;
  if (scope.collectionIds?.length === 0) delete scope.collectionIds;
  emit("change", hasScope(scope) ? scope : undefined);
}
</script>

<template>
  <p v-if="props.products.length === 0 && props.collections.length === 0" class="text-body-sm text-muted-foreground">{{ props.emptyLabel ?? t.everything }}</p>
  <div v-else class="grid gap-2" data-slot="scope-picker">
    <p class="text-body-sm text-muted-foreground" aria-live="polite">{{ all ? (props.emptyLabel ?? t.everything) : t.scopeCount(String(productIds.length + collectionIds.length)) }}</p>
    <div class="grid max-h-44 gap-1 overflow-y-auto rounded-control border border-border p-2 sm:grid-cols-2">
      <label v-for="c in props.collections" :key="c.id" class="flex min-w-0 items-center gap-2 text-body-sm">
        <NqCheckbox :model-value="collectionIds.includes(c.id)" @update:model-value="(on: boolean) => toggle('collectionIds', c.id, on)" />
        <span class="truncate">{{ c.title }}</span>
        <NqBadge variant="outline">{{ t.collection }}</NqBadge>
      </label>
      <label v-for="p in props.products" :key="p.id" class="flex min-w-0 items-center gap-2 text-body-sm">
        <NqCheckbox :model-value="productIds.includes(p.id)" @update:model-value="(on: boolean) => toggle('productIds', p.id, on)" />
        <span class="truncate">{{ p.name }}</span>
      </label>
    </div>
  </div>
</template>
