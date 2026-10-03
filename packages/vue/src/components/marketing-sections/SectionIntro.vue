<script setup lang="ts">
import { cn } from "../../lib/cn";

// Internal: the eyebrow, title and description at the top of a marketing section.
withDefaults(defineProps<{ eyebrow?: string; title?: string; description?: string; headingId: string; as?: "h2" | "h3"; align?: "start" | "center"; hasEyebrow?: boolean; hasTitle?: boolean; hasDescription?: boolean }>(), {
  as: "h2",
  align: "start",
  eyebrow: undefined,
  title: undefined,
  description: undefined,
});
</script>

<template>
  <div :class="cn('flex max-w-2xl flex-col gap-2', align === 'center' && 'mx-auto items-center text-center')">
    <div v-if="hasEyebrow || eyebrow" class="eyebrow text-nq-brand"><slot name="eyebrow">{{ eyebrow }}</slot></div>
    <component :is="as" v-if="hasTitle || title" :id="headingId" class="font-semibold text-foreground text-h2 text-balance"><slot name="title">{{ title }}</slot></component>
    <p v-if="hasDescription || description" class="text-body-sm text-nq-fg-body text-pretty"><slot name="description">{{ description }}</slot></p>
  </div>
</template>
