<script setup lang="ts">
import { cn } from "../../lib/cn";

// A label and a figure on one line, for the register's totals and receipts.
interface Props {
  label: string;
  strong?: boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <div :class="cn('flex items-baseline justify-between gap-3', props.strong ? 'text-label text-foreground' : 'text-body-sm text-muted-foreground')">
    <dt>{{ props.label }}</dt>
    <dd :class="cn('tabular-nums', props.strong && 'text-h3')"><slot /></dd>
  </div>
</template>
