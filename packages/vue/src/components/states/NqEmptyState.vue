<script setup lang="ts">
import { Inbox } from "lucide-vue-next";
import type { Component, HTMLAttributes } from "vue";
import NqStateFrame from "./NqStateFrame.vue";

// Nothing here yet. The `actions` slot takes one primary button and optionally one secondary.
interface Props {
  /** A lucide-vue-next icon. Default Inbox. */
  icon?: Component;
  title?: string;
  description?: string;
  /** Hatched ground (grid expression); off automatically in the native expression. */
  hatch?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { icon: () => Inbox, hatch: false });
</script>

<template>
  <NqStateFrame slot-name="empty-state" :icon="props.icon" :title="props.title" :description="props.description" :hatch="props.hatch" :class="props.class">
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template v-if="$slots.description" #description><slot name="description" /></template>
    <slot />
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
  </NqStateFrame>
</template>
