<script setup lang="ts">
import { AlertDialogTitle } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <AlertDialogTitle data-slot="alert-dialog-title" :class="cn('text-h3 text-foreground', props.class)"><slot /></AlertDialogTitle>
</template>
