<script setup lang="ts">
import { inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { PAD, TABLE_STYLE, type TableStyle } from "./context";

const props = withDefaults(defineProps<{ scope?: string; class?: HTMLAttributes["class"] }>(), { scope: "col" });
const fallback = (): TableStyle => ({ density: "default", hover: true, striped: false });
const style = inject(TABLE_STYLE, fallback);
</script>

<template>
  <th
    data-slot="table-head"
    :scope="props.scope"
    :class="cn('h-row text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground', PAD[style().density], props.class)"
  >
    <slot />
  </th>
</template>
