<script setup lang="ts">
import { AlertDialogRoot, useForwardPropsEmits } from "reka-ui";

// A confirmation that interrupts: modal, no × button, no outside-press dismissal. `v-model:open` controls it.
interface Props {
  open?: boolean;
  defaultOpen?: boolean;
}
const props = withDefaults(defineProps<Props>(), { open: undefined, defaultOpen: false });
const emits = defineEmits<{ "update:open": [value: boolean] }>();
const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <AlertDialogRoot v-slot="slotProps" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </AlertDialogRoot>
</template>
