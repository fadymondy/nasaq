<script setup lang="ts">
import { Undo2 } from "lucide-vue-next";
import { onBeforeUnmount, watch } from "vue";
import { NqButton } from "../button";
import type { CartRemoval } from "./cart-logic";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";

// The undo bar after a remove. It goes away by itself after `timeout` ms (default 8000; 0 keeps it) by emitting `dismiss`.
interface Props {
  removal: CartRemoval;
  timeout?: number;
  labels?: StoreCartLabels;
}
const props = withDefaults(defineProps<Props>(), { timeout: 8000, labels: undefined });
const emit = defineEmits<{ undo: []; dismiss: [] }>();
const { t } = useStoreCartStrings(() => props.labels);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => [props.removal, props.timeout] as const,
  () => {
    clearTimeout(timer);
    if (props.timeout) timer = setTimeout(() => emit("dismiss"), props.timeout);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div data-slot="store-cart-removed" class="flex items-center justify-between gap-3 rounded-control border border-border bg-secondary px-3 py-2 text-body-sm text-foreground">
    <span class="min-w-0 [overflow-wrap:anywhere]">{{ t.removedNotice(props.removal.line.name) }}</span>
    <NqButton variant="link" size="sm" @click="emit('undo')">
      <Undo2 aria-hidden="true" />
      {{ t.undo }}
    </NqButton>
  </div>
</template>
