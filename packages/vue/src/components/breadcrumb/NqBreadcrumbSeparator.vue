<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqIcon } from "../icon";

// Place between items, as a sibling of NqBreadcrumbItem. The default slot replaces the directional chevron.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" :class="cn('[&_svg]:size-3.5', props.class)">
    <span v-if="$slots.default" class="inline-flex rtl:-scale-x-100"><slot /></span>
    <NqIcon v-else :icon="ChevronRight" directional />
  </li>
</template>
