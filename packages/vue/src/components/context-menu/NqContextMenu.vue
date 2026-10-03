<script setup lang="ts">
import { ContextMenuRoot } from "reka-ui";

// The root. Wrap an NqContextMenuTrigger and an NqContextMenuContent. Open state is v-model:open.
interface Props {
  /** Block the page behind the menu. Default true. */
  modal?: boolean;
  dir?: "ltr" | "rtl";
  /** Long-press time on touch, in ms. */
  pressOpenDelay?: number;
}
const props = withDefaults(defineProps<Props>(), { modal: true, dir: undefined, pressOpenDelay: 700 });
const emits = defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <ContextMenuRoot :modal="props.modal" :dir="props.dir" :press-open-delay="props.pressOpenDelay" @update:open="emits('update:open', $event)">
    <slot />
  </ContextMenuRoot>
</template>
