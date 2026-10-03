<script setup lang="ts">
import { DialogTrigger } from "reka-ui";
import type { Component } from "vue";

// <NqDrawerTrigger as-child><NqButton variant="secondary">…</NqButton></NqDrawerTrigger>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <DialogTrigger data-slot="drawer-trigger" :as="props.as" :as-child="props.asChild">
    <slot />
  </DialogTrigger>
</template>
