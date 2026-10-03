<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { ISSUE_TYPE_ICONS, type IssueType } from "./issue-logic";

// The glyph of an issue type: bug, feature, improvement, task, chore.
interface Props {
  type: IssueType;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <component :is="ISSUE_TYPE_ICONS[props.type]" aria-hidden="true" :class="cn('size-4 shrink-0 text-muted-foreground', props.class)" />
</template>
