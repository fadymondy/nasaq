<script setup lang="ts">
import { provide } from "vue";
import { SORTABLE_KEY } from "./context";

// Lets the user drag sidebar items into a new order. Mouse drags after 4px, touch after a 250ms press (so the list still
// scrolls). Keyboard reordering lives in NqSidebarCustomize. Renders no element: the items are siblings in your own list.
interface Props {
  /** The visible ids, in order (`layout.visible`). */
  ids: string[];
  onMove: (activeId: string, overId: string) => void;
}
const props = defineProps<Props>();
provide(SORTABLE_KEY, { onMove: (a, o) => props.onMove(a, o), suppressClickUntil: { value: 0 } });
</script>

<template>
  <slot />
</template>
