<script setup lang="ts">
import { Package } from "lucide-vue-next";
import type { Component, HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The tile an item shows in the card and the sheet.
interface Props {
  /** A lucide-vue-next icon. Default Package. */
  icon?: Component;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <span aria-hidden="true" :class="cn('flex size-10 shrink-0 items-center justify-center rounded-card border border-border bg-secondary text-foreground [&_svg]:size-5', props.class)">
    <component :is="props.icon ?? Package" />
  </span>
</template>
