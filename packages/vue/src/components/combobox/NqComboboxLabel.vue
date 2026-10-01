<script setup lang="ts">
import { ComboboxLabel } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Must be inside an NqComboboxGroup.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <ComboboxLabel data-slot="combobox-label" :class="cn('px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground', props.class)"><slot /></ComboboxLabel>
</template>
