<script setup lang="ts">
import { Flag } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { IssuePriority } from "./issue-logic";

// A flag in the priority's colour. The name is always shown next to it.
interface Props {
  priority: IssuePriority;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const COLOR: Record<IssuePriority, string> = {
  urgent: "var(--nq-danger)",
  high: "var(--nq-tag-orange)",
  medium: "var(--nq-tag-amber)",
  low: "var(--nq-tag-blue)",
  none: "var(--nq-fg-muted)",
};
</script>

<template>
  <Flag aria-hidden="true" :class="cn('size-4 shrink-0', props.class)" :style="{ color: COLOR[props.priority] }" />
</template>
