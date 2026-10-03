<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCopyButton } from "../copy-button";
import { brandColorCopyValue, fill, type BrandColor } from "./logic";
import type { BrandGuidelinesLabels } from "./strings";
import { useBrandStrings } from "./use-strings";

/** One colour: the fill, its name and role, and its value with a button that copies it exactly. */
interface Props {
  color: BrandColor;
  labels?: BrandGuidelinesLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const t = useBrandStrings(() => props.labels);
const name = computed(() => props.color.name ?? (t.value as unknown as Record<string, string>)[props.color.id] ?? props.color.id);
const value = computed(() => brandColorCopyValue(props.color));
</script>

<template>
  <div data-slot="brand-swatch" :class="cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card', props.class)">
    <div class="flex h-20 items-end justify-between p-3" :style="{ backgroundColor: props.color.value }">
      <span v-if="props.color.onColor" class="text-h3" :style="{ color: props.color.onColor }">{{ t.sample }}</span>
    </div>
    <div class="flex items-center justify-between gap-2 p-3">
      <div class="flex min-w-0 flex-col">
        <span class="truncate text-label text-foreground">{{ name }}</span>
        <bdi dir="ltr" class="font-mono text-caption uppercase text-muted-foreground">{{ value }}</bdi>
        <span v-if="props.color.usage" class="mt-1 text-caption text-muted-foreground">{{ props.color.usage }}</span>
      </div>
      <NqCopyButton :value="value" :label="fill(t.copy, { value })" :copied-label="fill(t.copied, { value })" size="icon-sm" />
    </div>
  </div>
</template>
