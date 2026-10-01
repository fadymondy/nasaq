<script setup lang="ts">
import { HoverCardRoot } from "reka-ui";

interface Props {
  /** Controlled open state (v-model:open). */
  open?: boolean;
  defaultOpen?: boolean;
  /** Hover delay before opening, in ms (the Trigger delay in React; here on the root). */
  delay?: number;
  /** Delay before closing, in ms. */
  closeDelay?: number;
}
const props = withDefaults(defineProps<Props>(), { open: undefined, defaultOpen: false, delay: 600, closeDelay: 300 });
const emits = defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <HoverCardRoot
    v-slot="slotProps"
    :open="props.open"
    :default-open="props.defaultOpen"
    :open-delay="props.delay"
    :close-delay="props.closeDelay"
    @update:open="emits('update:open', $event)"
  >
    <slot v-bind="slotProps" />
  </HoverCardRoot>
</template>
