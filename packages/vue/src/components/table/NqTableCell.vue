<script setup lang="ts">
import { inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { PAD, TABLE_STYLE, type TableStyle } from "./context";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const fallback = (): TableStyle => ({ density: "default", hover: true, striped: false });
const style = inject(TABLE_STYLE, fallback);
</script>

<template>
  <td data-slot="table-cell" :class="cn('h-row align-middle whitespace-nowrap', PAD[style().density], props.class)"><slot /></td>
</template>
