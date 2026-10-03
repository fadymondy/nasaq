<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";

// Three pulsing dots. The pulse stops under reduced motion; the label is read by screen readers.
const props = defineProps<{
  /** Announced text. Default "Assistant is typing" / "المساعد يكتب". */
  label?: string;
  class?: HTMLAttributes["class"];
}>();
const t = useT();
</script>

<template>
  <span data-slot="typing-indicator" role="status" :class="cn('inline-flex items-center gap-1 py-1', props.class)">
    <span
      v-for="i in 3"
      :key="i"
      aria-hidden="true"
      :style="{ animationDelay: `${(i - 1) * 150}ms` }"
      class="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-pulse"
    />
    <span class="sr-only">{{ props.label ?? t("Assistant is typing", "المساعد يكتب") }}</span>
  </span>
</template>
