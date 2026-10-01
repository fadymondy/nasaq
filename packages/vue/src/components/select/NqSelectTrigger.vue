<script setup lang="ts">
import { ChevronsUpDown } from "lucide-vue-next";
import { injectSelectRootContext, SelectIcon, SelectTrigger } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The Field-style button that opens the list. Put an NqSelectValue inside.
interface Props {
  /** Marks the control invalid (data-invalid + aria-invalid). */
  invalid?: boolean;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const root = injectSelectRootContext();
</script>

<template>
  <SelectTrigger
    data-slot="select-trigger"
    :data-popup-open="root.open.value ? '' : undefined"
    :data-invalid="props.invalid ? '' : undefined"
    :aria-invalid="props.invalid || undefined"
    :class="
      cn(
        'flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground',
        'min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq',
        'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus',
        'data-invalid:border-nq-danger data-disabled:cursor-not-allowed data-disabled:opacity-50',
        'pointer-coarse:text-[16px]',
        props.class,
      )
    "
  >
    <slot />
    <SelectIcon as-child>
      <span class="flex shrink-0 text-muted-foreground [&_svg]:size-4"><ChevronsUpDown /></span>
    </SelectIcon>
  </SelectTrigger>
</template>
