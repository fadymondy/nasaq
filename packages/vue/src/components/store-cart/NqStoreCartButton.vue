<script setup lang="ts">
import { ShoppingCart } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";

// The header cart button with its item count. The count is part of the accessible name.
interface Props {
  count: number;
  labels?: StoreCartLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const { t, n } = useStoreCartStrings(() => props.labels);
</script>

<template>
  <NqButton variant="ghost" size="icon" :aria-label="t.cartCount(t.items(n(props.count), props.count))" :class="cn('relative', props.class)">
    <ShoppingCart aria-hidden="true" />
    <span v-if="props.count > 0" data-slot="store-cart-count" aria-hidden="true" class="absolute -end-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-medium leading-4 text-primary-foreground">{{ n(props.count) }}</span>
  </NqButton>
</template>
