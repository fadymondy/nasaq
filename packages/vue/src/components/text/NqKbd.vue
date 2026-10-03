<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/** Keyboard key. Pass `aria-label` for glyph keys (a command glyph is "Command") so screen readers say the key name. */
const props = defineProps<{ class?: HTMLAttributes["class"]; ariaLabel?: string }>();
</script>

<template>
  <kbd
    data-slot="kbd"
    :role="props.ariaLabel ? 'img' : undefined"
    :aria-label="props.ariaLabel"
    dir="ltr"
    :class="
      cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-border bg-card px-1 font-mono text-[11px] text-muted-foreground',
        props.class,
      )
    "
  >
    <slot />
  </kbd>
</template>
