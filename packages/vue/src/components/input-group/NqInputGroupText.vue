<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Text affix for units and protocols.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <span data-slot="input-group-text" :class="cn('select-none whitespace-nowrap', props.class)"><slot /></span>
</template>
