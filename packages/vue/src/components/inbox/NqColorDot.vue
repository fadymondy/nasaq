<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { InboxColor } from "./inbox-format";

// The dot shown for a colour label. Uses the tag palette, so it follows the theme.
const props = defineProps<{ color: InboxColor; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <span aria-hidden="true" :class="cn('inline-block size-2.5 shrink-0 rounded-full', props.class)" :style="{ background: `var(--nq-tag-${props.color})` }" />
</template>
