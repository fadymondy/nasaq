<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

interface Props {
  /** Time or date in the header. Keep it short. */
  title: string;
  /** `round` clips to a circle, `square` to a rounded square. Default `square`. */
  shape?: "round" | "square";
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { shape: "square" });
defineSlots<{ default?(): unknown; headerEnd?(): unknown }>();
</script>

<template>
  <div
    data-slot="watch-glance"
    :data-shape="props.shape"
    :class="
      cn(
        'flex aspect-[4/5] w-48 flex-col overflow-hidden border-4 border-nq-line-strong bg-background text-foreground',
        props.shape === 'round' ? 'aspect-square rounded-full px-6 py-5' : 'rounded-[2rem] px-2 py-3',
        props.class,
      )
    "
  >
    <div :class="cn('flex items-center justify-between gap-2 px-2 text-caption', props.shape === 'round' && 'justify-center')">
      <span class="font-semibold tabular-nums">{{ props.title }}</span>
      <span v-if="$slots.headerEnd" class="text-muted-foreground"><slot name="headerEnd" /></span>
    </div>
    <div class="mt-1 flex min-h-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden"><slot /></div>
  </div>
</template>
