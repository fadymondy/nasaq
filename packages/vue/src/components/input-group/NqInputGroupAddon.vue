<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// An icon, a text affix (`https://`, `SAR`) or a button.
interface Props {
  /** Which edge the addon sits on. Logical: `end` is the left edge in RTL. Default `start`. */
  align?: "start" | "end";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { align: "start" });
</script>

<template>
  <div
    data-slot="input-group-addon"
    :data-align="props.align"
    :class="
      cn(
        'flex h-full shrink-0 items-center gap-1.5 text-body-sm text-muted-foreground [&_svg]:size-4',
        props.align === 'start' ? 'order-first ps-3 pe-1' : 'order-last ps-1 pe-3',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
