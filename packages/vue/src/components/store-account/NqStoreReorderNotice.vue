<script setup lang="ts">
import { computed } from "vue";
import { NqButton } from "../button";
import type { StoreAccountStrings } from "./account-strings";
import type { ReorderPlan } from "./account-logic";

// What "Order again" did: added, reduced for stock, skipped. Shared by the list and the order page.
const props = defineProps<{ plan: ReorderPlan; t: StoreAccountStrings; onOpenCart?: () => void }>();
const added = computed(() => props.plan.add.length);
const changedPrice = computed(() => props.plan.add.some((l) => l.priceChanged));
</script>

<template>
  <div role="status" class="flex flex-col gap-1 rounded-card border border-border bg-secondary px-3 py-2 text-body-sm">
    <span class="font-medium">{{ added > 0 ? props.t.reorderAdded(added) : props.t.reorderNothing }}</span>
    <span v-if="props.plan.reduced.length > 0">{{ props.t.reorderReduced(props.plan.reduced.length) }}</span>
    <span v-if="props.plan.skipped.length > 0 && added > 0">{{ props.t.reorderSkipped(props.plan.skipped.length) }}</span>
    <span v-if="changedPrice" class="text-muted-foreground">{{ props.t.reorderPriceChanged }}</span>
    <NqButton v-if="added > 0 && props.onOpenCart" size="sm" variant="secondary" class="mt-1 self-start" @click="props.onOpenCart()">{{ props.t.goToCart }}</NqButton>
  </div>
</template>
