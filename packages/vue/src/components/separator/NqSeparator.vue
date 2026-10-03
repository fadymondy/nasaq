<script setup lang="ts">
import { Separator } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = withDefaults(defineProps<{ orientation?: "horizontal" | "vertical"; class?: HTMLAttributes["class"] }>(), {
  orientation: "horizontal",
});
</script>

<template>
  <Separator
    data-slot="separator"
    :orientation="props.orientation"
    :class="cn('shrink-0 bg-border', props.orientation === 'vertical' ? 'h-4 w-px self-center' : 'h-px w-full', props.class)"
  />
</template>
