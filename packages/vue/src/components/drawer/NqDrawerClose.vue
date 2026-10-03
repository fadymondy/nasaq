<script setup lang="ts">
import { DialogClose } from "reka-ui";
import type { Component } from "vue";

// <NqDrawerClose as-child><NqButton variant="secondary">…</NqButton></NqDrawerClose>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <DialogClose data-slot="drawer-close" :as="props.as" :as-child="props.asChild">
    <slot />
  </DialogClose>
</template>
