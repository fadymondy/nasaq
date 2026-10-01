<script setup lang="ts">
import { DialogClose } from "reka-ui";
import type { Component } from "vue";

// A plain close (React: AlertDialogClose). Use NqAlertDialogAction / NqAlertDialogCancel for the styled buttons.
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <DialogClose data-slot="alert-dialog-close" :as="props.as" :as-child="props.asChild">
    <slot />
  </DialogClose>
</template>
