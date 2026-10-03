<script setup lang="ts">
import { Image as ImageIcon, Package } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A placeholder tile for a screenshot that has not loaded.
interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <div aria-hidden="true" :class="cn('flex aspect-video items-center justify-center rounded-card border border-border bg-muted text-muted-foreground', props.class)">
    <ImageIcon class="size-8" />
    <Package class="sr-only" />
  </div>
</template>
