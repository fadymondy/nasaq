<script setup lang="ts">
import { computed, inject, useAttrs, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { TABLE_STYLE, type TableStyle } from "./context";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const fallback = (): TableStyle => ({ density: "default", hover: true, striped: false });
const style = inject(TABLE_STYLE, fallback);
const attrs = useAttrs();
const selected = computed(() => attrs["data-state"] === "selected");
</script>

<template>
  <tr
    data-slot="table-row"
    :aria-selected="selected || undefined"
    :class="
      cn(
        'border-b border-border transition-colors duration-150 ease-nq',
        style().striped && 'even:bg-secondary/40',
        style().hover && 'hover:bg-nq-hover',
        'data-[state=selected]:bg-nq-selected',
        props.class,
      )
    "
  >
    <slot />
  </tr>
</template>
