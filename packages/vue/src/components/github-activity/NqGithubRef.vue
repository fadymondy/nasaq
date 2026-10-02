<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A link when there is an `href`, plain text when not. Opens GitHub in a new tab. Internal to NqGithubActivity.
const props = defineProps<{ href?: string; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <a
    v-if="props.href"
    :href="props.href"
    target="_blank"
    rel="noopener noreferrer"
    :class="cn('rounded-sm outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', props.class)"
  >
    <slot />
  </a>
  <span v-else :class="props.class"><slot /></span>
</template>
