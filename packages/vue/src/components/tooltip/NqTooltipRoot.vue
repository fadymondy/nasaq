<script setup lang="ts">
import { TooltipRoot } from "reka-ui";

interface Props {
  /** Controlled open state (v-model:open). */
  open?: boolean;
  defaultOpen?: boolean;
  /** Hover delay before opening, in ms (the Trigger delay in React; here on the root). */
  delay?: number;
}
const props = withDefaults(defineProps<Props>(), { open: undefined, defaultOpen: false, delay: undefined });
const emits = defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <TooltipRoot
    v-slot="slotProps"
    :open="props.open"
    :default-open="props.defaultOpen"
    :delay-duration="props.delay"
    @update:open="emits('update:open', $event)"
  >
    <slot v-bind="slotProps" />
  </TooltipRoot>
</template>
