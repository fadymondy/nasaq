<script setup lang="ts">
import { DialogDescription } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <DialogDescription data-slot="dialog-description" :class="cn('text-body-sm text-muted-foreground', props.class)"><slot /></DialogDescription>
</template>
