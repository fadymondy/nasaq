<script setup lang="ts">
import { PopoverRoot, useForwardPropsEmits } from "reka-ui";

interface Props {
  /** Controlled open state (v-model:open). */
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
}
const props = withDefaults(defineProps<Props>(), { open: undefined, defaultOpen: false, modal: false });
const emits = defineEmits<{ "update:open": [value: boolean] }>();
const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <PopoverRoot v-slot="slotProps" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </PopoverRoot>
</template>
