<script setup lang="ts">
import { DropdownMenuRoot } from "reka-ui";

// The root. Open state is v-model:open (or default-open).
interface Props {
  open?: boolean;
  defaultOpen?: boolean;
  /** Trap focus and block the page behind the menu. Default true. */
  modal?: boolean;
  dir?: "ltr" | "rtl";
}
const props = withDefaults(defineProps<Props>(), { open: undefined, defaultOpen: false, modal: true, dir: undefined });
const emits = defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <DropdownMenuRoot v-slot="slotProps" :open="props.open" :default-open="props.defaultOpen" :modal="props.modal" :dir="props.dir" @update:open="emits('update:open', $event)">
    <slot v-bind="slotProps" />
  </DropdownMenuRoot>
</template>
