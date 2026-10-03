<script setup lang="ts">
import { AlertDialogTrigger } from "reka-ui";
import type { Component } from "vue";

// <NqAlertDialogTrigger as-child><NqButton variant="danger">Delete</NqButton></NqAlertDialogTrigger>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <AlertDialogTrigger data-slot="alert-dialog-trigger" :as="props.as" :as-child="props.asChild">
    <slot />
  </AlertDialogTrigger>
</template>
