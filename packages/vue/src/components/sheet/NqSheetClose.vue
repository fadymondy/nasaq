<script setup lang="ts">
import { DialogClose } from "reka-ui";
import type { Component } from "vue";

// <NqSheetClose as-child><NqButton variant="ghost">Cancel</NqButton></NqSheetClose>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <DialogClose data-slot="sheet-close" :as="props.as" :as-child="props.asChild">
    <slot />
  </DialogClose>
</template>
