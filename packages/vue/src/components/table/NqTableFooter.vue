<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <tfoot data-slot="table-footer" :class="cn('border-t bg-secondary/50 font-medium [&_tr]:even:bg-transparent', props.class)"><slot /></tfoot>
</template>
