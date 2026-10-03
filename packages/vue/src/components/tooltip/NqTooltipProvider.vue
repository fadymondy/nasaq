<script setup lang="ts">
import { TooltipProvider } from "reka-ui";

interface Props {
  /** Hover delay before opening, in ms. */
  delay?: number;
  /** Within this many ms of closing one tooltip, the next opens instantly. */
  skipDelayDuration?: number;
}
const props = withDefaults(defineProps<Props>(), { delay: 600, skipDelayDuration: 300 });
</script>

<template>
  <TooltipProvider :delay-duration="props.delay" :skip-delay-duration="props.skipDelayDuration"><slot /></TooltipProvider>
</template>
