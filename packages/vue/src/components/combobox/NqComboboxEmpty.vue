<script setup lang="ts">
import { ComboboxEmpty } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Shown only when the filter leaves no items. Localise the copy.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <ComboboxEmpty data-slot="combobox-empty" :class="cn('px-2.5 py-2 text-body-sm text-muted-foreground empty:hidden', props.class)">
    <slot />
  </ComboboxEmpty>
</template>
