<script setup lang="ts">
import { Brain } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import type { BrainSummary } from "./types";

// The brain's mark: an image, an emoji, or a brain icon. Internal to the brain list.
const props = withDefaults(defineProps<{ brain: BrainSummary; size?: "md" | "lg" }>(), { size: "md" });
const isImage = computed(() => /^(http|\/|data:)/.test(props.brain.avatar ?? ""));
</script>

<template>
  <span
    aria-hidden="true"
    :class="cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary text-foreground', props.size === 'lg' ? 'size-11 text-h3' : 'size-9 text-body')"
  >
    <img v-if="isImage" :src="props.brain.avatar" alt="" class="size-full object-cover" />
    <template v-else-if="props.brain.avatar">{{ props.brain.avatar }}</template>
    <Brain v-else :class="props.size === 'lg' ? 'size-5' : 'size-4'" />
  </span>
</template>
