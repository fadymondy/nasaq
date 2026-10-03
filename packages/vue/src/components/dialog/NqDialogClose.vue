<script setup lang="ts">
import { DialogClose } from "reka-ui";
import type { Component } from "vue";

// <NqDialogClose as-child><NqButton variant="ghost">Cancel</NqButton></NqDialogClose>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <DialogClose data-slot="dialog-close" :as="props.as" :as-child="props.asChild">
    <slot />
  </DialogClose>
</template>
