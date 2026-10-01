<script setup lang="ts">
import { SelectSeparator } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <SelectSeparator data-slot="select-separator" :class="cn('-mx-1.5 my-1.5 h-px bg-border', props.class)" />
</template>
