<script setup lang="ts">
import { AlertDialogAction } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { buttonVariants } from "../button";

// The confirming button: a close that looks like a Button, so pressing it closes the dialog.
interface Props {
  /** Button look. Default "danger". */
  variant?: "primary" | "danger" | "secondary" | "ghost";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variant: "danger" });
</script>

<template>
  <AlertDialogAction data-slot="alert-dialog-action" :class="cn(buttonVariants({ variant: props.variant }), props.class)"><slot /></AlertDialogAction>
</template>
