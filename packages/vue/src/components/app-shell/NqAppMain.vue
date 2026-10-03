<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <!-- `id` and `tabindex` are the skip link's target; focus lands on the page, not in the header. -->
  <main id="app-main" tabindex="-1" data-slot="app-main" :class="cn('flex-1 px-4 py-page outline-none md:px-page', props.class)">
    <slot />
  </main>
</template>
