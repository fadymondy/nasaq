<script setup lang="ts">
import { Truck } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqProgress } from "../progress";
import { commerceFreeShippingProgress } from "./commerce";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";

// "You are $500 away from free shipping" with a progress bar that turns green when it is unlocked.
interface Props {
  /** Order value before shipping, minor units. */
  subtotal: number;
  /** Free shipping starts here, minor units. */
  threshold: number;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  labels?: StoreCartLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, labels: undefined });
const currency = useCurrency(() => props.currency);
const { t, money } = useStoreCartStrings(() => props.labels);
const state = computed(() => commerceFreeShippingProgress(props.subtotal, props.threshold));
const unlocked = computed(() => state.value.remaining === 0);
</script>

<template>
  <div data-slot="store-free-shipping" :data-unlocked="unlocked || undefined" :class="cn('flex flex-col gap-2', props.class)">
    <p class="flex items-center gap-2 text-body-sm text-foreground">
      <Truck aria-hidden="true" :class="cn('size-4 shrink-0', unlocked ? 'text-nq-success-text' : 'text-muted-foreground')" />
      {{ unlocked ? t.freeUnlocked : t.awayFromFree(money(state.remaining, currency)) }}
    </p>
    <NqProgress :aria-label="t.shippingProgress" :value="Math.round(state.progress * 100)" :tone="unlocked ? 'success' : 'default'" size="sm" />
  </div>
</template>
