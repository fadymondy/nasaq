<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A two-column account layout: navigation beside the content, stacked on narrow screens.
// Slots: `nav` (the navigation), `title` (or the `title` prop), and the default content.
const props = defineProps<{ title?: string; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="store-account-layout" :class="cn('mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 md:grid-cols-[14rem_minmax(0,1fr)]', props.class)">
    <h1 v-if="props.title || $slots.title" class="m-0 text-h2 font-semibold md:col-span-2"><slot name="title">{{ props.title }}</slot></h1>
    <aside class="min-w-0"><slot name="nav" /></aside>
    <main class="min-w-0"><slot /></main>
  </div>
</template>
