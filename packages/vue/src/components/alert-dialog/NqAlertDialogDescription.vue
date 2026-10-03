<script setup lang="ts">
import { AlertDialogDescription } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <AlertDialogDescription data-slot="alert-dialog-description" :class="cn('text-body-sm text-muted-foreground', props.class)"><slot /></AlertDialogDescription>
</template>
