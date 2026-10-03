<script setup lang="ts">
import { DialogRoot } from "reka-ui";
import { computed, provide, ref, watch } from "vue";
import { DRAWER_CONTEXT } from "./context";

/**
 * A bottom drawer for touch screens: a Dialog that slides up, has a drag handle and closes when
 * you swipe it down. Use `NqSheet` for side panels and desktop-first surfaces.
 */
interface Props {
  /** Controlled open state (v-model:open). */
  open?: boolean;
  defaultOpen?: boolean;
}
const props = withDefaults(defineProps<Props>(), { open: undefined, defaultOpen: false });
const emits = defineEmits<{ "update:open": [value: boolean] }>();

const inner = ref(props.defaultOpen);
const isOpen = computed(() => props.open ?? inner.value);
function setOpen(next: boolean) {
  inner.value = next;
  emits("update:open", next);
}

const offset = ref(0);
const dragging = ref(false);
// A fresh open starts in place: forget the drag of the previous one.
watch(isOpen, (open) => {
  if (open) offset.value = 0;
});
provide(DRAWER_CONTEXT, { offset, dragging, close: () => setOpen(false) });
</script>

<template>
  <DialogRoot v-slot="slotProps" :open="isOpen" @update:open="setOpen">
    <slot v-bind="slotProps" />
  </DialogRoot>
</template>
