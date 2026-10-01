<script setup lang="ts">
import { DialogTrigger } from "reka-ui";
import type { Component } from "vue";

// <NqSheetTrigger as-child><NqButton>Edit project</NqButton></NqSheetTrigger>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <DialogTrigger data-slot="sheet-trigger" :as="props.as" :as-child="props.asChild">
    <slot />
  </DialogTrigger>
</template>
