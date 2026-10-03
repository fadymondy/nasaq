<script setup lang="ts">
import { DialogTitle } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <DialogTitle data-slot="drawer-title" :class="cn('text-label text-foreground', props.class)"><slot /></DialogTitle>
</template>
