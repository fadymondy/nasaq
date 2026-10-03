<script setup lang="ts">
import { DialogTrigger } from "reka-ui";
import type { Component } from "vue";

// <NqDialogTrigger as-child><NqButton variant="primary">Open</NqButton></NqDialogTrigger>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <DialogTrigger data-slot="dialog-trigger" :as="props.as" :as-child="props.asChild">
    <slot />
  </DialogTrigger>
</template>
