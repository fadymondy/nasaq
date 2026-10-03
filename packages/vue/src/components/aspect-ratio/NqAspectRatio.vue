<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

withDefaults(
  defineProps<{
    /** Width over height: `16 / 9`, `4 / 3`, `1`. Default 16 / 9. */
    ratio?: number;
    class?: HTMLAttributes["class"];
  }>(),
  { ratio: 16 / 9 },
);
</script>

<template>
  <div
    data-slot="aspect-ratio"
    :class="
      cn(
        'relative w-full overflow-hidden',
        '[&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:size-full [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover [&>video]:absolute [&>video]:inset-0 [&>video]:size-full [&>video]:object-cover',
        $props.class,
      )
    "
    :style="{ aspectRatio: String(ratio) }"
  >
    <slot />
  </div>
</template>
