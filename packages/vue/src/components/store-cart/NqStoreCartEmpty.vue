<script setup lang="ts">
import { ShoppingBag } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { NqButton } from "../button";
import { NqEmptyState } from "../states";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";

// The empty cart. The "Start shopping" button shows when you pass `@continue-shopping`.
interface Props {
  onContinueShopping?: () => void;
  labels?: StoreCartLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onContinueShopping: undefined, labels: undefined });
const { t } = useStoreCartStrings(() => props.labels);
</script>

<template>
  <NqEmptyState data-slot="store-cart-empty" :icon="ShoppingBag" :title="t.emptyTitle" :description="t.emptyDescription" :class="props.class">
    <template v-if="props.onContinueShopping" #actions>
      <NqButton variant="primary" @click="props.onContinueShopping()">{{ t.emptyAction }}</NqButton>
    </template>
  </NqEmptyState>
</template>
