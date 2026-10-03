<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <a
    data-slot="app-footer-link"
    :class="cn('rounded-xs outline-none transition-colors duration-150 ease-nq hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus', props.class)"
  >
    <slot />
  </a>
</template>
