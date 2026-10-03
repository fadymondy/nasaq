<script setup lang="ts">
import { ContextMenuSub } from "reka-ui";
import { provide, ref, watch } from "vue";
import { MENU_SUB_OPEN } from "./context";

interface Props {
  open?: boolean;
  defaultOpen?: boolean;
}
const props = withDefaults(defineProps<Props>(), { open: undefined, defaultOpen: false });
const emits = defineEmits<{ "update:open": [value: boolean] }>();
const open = ref(props.open ?? props.defaultOpen);
watch(() => props.open, (v) => v !== undefined && (open.value = v));
provide(MENU_SUB_OPEN, open);
function onOpen(value: boolean) {
  open.value = value;
  emits("update:open", value);
}
</script>

<template>
  <ContextMenuSub :open="open" @update:open="onOpen"><slot /></ContextMenuSub>
</template>
