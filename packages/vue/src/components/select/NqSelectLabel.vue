<script setup lang="ts">
import { SelectLabel } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Put it inside an NqSelectGroup, which names the group for assistive tech.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <SelectLabel data-slot="select-label" :class="cn('px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground', props.class)"><slot /></SelectLabel>
</template>
