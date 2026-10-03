<script setup lang="ts">
import { AlertDialogCancel } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { buttonVariants } from "../button";

// The dismissing button. Put it first in the footer; it takes initial focus so Enter never destroys.
interface Props {
  /** Button look. Default "ghost". */
  variant?: "primary" | "danger" | "secondary" | "ghost";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variant: "ghost" });
</script>

<template>
  <AlertDialogCancel data-slot="alert-dialog-cancel" :class="cn(buttonVariants({ variant: props.variant }), props.class)"><slot /></AlertDialogCancel>
</template>
