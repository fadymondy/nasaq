<script setup lang="ts">
import { DialogRoot, useForwardPropsEmits } from "reka-ui";

interface Props {
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
}
const props = withDefaults(defineProps<Props>(), { open: undefined, defaultOpen: false, modal: true });
const emits = defineEmits<{ "update:open": [value: boolean] }>();
const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <DialogRoot v-slot="slotProps" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </DialogRoot>
</template>
