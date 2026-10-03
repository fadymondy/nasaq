<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { badgeVariants } from "../badge";

/** A neutral badge at the inline end of the sign-in method used last time. The parent needs `relative`. */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <span data-slot="last-used" :class="cn(badgeVariants({ variant: 'neutral' }), 'pointer-events-none absolute end-2 top-1/2 -translate-y-1/2', props.class)">
    <slot />
  </span>
</template>
