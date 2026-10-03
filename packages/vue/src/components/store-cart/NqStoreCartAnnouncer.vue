<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { StoreCartMessage } from "./use-store-cart";

// The hidden aria-live region for cart changes: "Everyday cotton tee added to your cart, quantity 2". Mount it once.
interface Props {
  /** From `useStoreCart().message`. Each new `id` is read out again, even when the words are the same. */
  message: StoreCartMessage;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <div data-slot="store-cart-announcer" role="status" aria-live="polite" aria-atomic="true" :class="cn('sr-only', props.class)">{{ props.message.text ? `${props.message.text}${props.message.id % 2 ? " " : ""}` : "" }}</div>
</template>
