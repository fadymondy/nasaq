<script setup lang="ts">
import { CircleAlert } from "lucide-vue-next";
import type { Component, HTMLAttributes } from "vue";
import NqStateFrame from "./NqStateFrame.vue";

// Errors carry an icon and words, never colour alone.
interface Props {
  /** A lucide-vue-next icon. Default CircleAlert. */
  icon?: Component;
  title?: string;
  description?: string;
  /** Hatched ground (grid expression); off automatically in the native expression. */
  hatch?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { icon: () => CircleAlert, hatch: false });
</script>

<template>
  <NqStateFrame
    slot-name="error-state"
    role="alert"
    :icon="props.icon"
    icon-class="text-nq-danger-text"
    :title="props.title"
    :description="props.description"
    :hatch="props.hatch"
    :class="props.class"
  >
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template v-if="$slots.description" #description><slot name="description" /></template>
    <slot />
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
  </NqStateFrame>
</template>
