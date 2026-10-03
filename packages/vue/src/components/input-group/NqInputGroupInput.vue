<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The borderless input. Native input attributes (placeholder, name, type, disabled …) fall through; v-model works.
interface Props {
  /** Force left-to-right (URLs, emails, codes) inside an RTL page. */
  ltr?: boolean;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const model = defineModel<string | number>();
</script>

<template>
  <input
    v-model="model"
    data-slot="input-group-input"
    :dir="props.ltr ? 'ltr' : undefined"
    :class="
      cn(
        'h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-body text-foreground outline-none',
        'placeholder:text-muted-foreground disabled:cursor-not-allowed',
        'pointer-coarse:text-[16px]',
        props.ltr && 'text-start',
        props.class,
      )
    "
  />
</template>
