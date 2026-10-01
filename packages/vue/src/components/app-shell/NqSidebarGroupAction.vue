<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";

/** A small icon button for a group label, e.g. "+" to create a project. Hidden on the collapsed rail. */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <NqButton variant="ghost" size="icon-sm" :class="cn('size-6 text-muted-foreground [&_svg]:size-3.5', props.class)"><slot /></NqButton>
</template>
