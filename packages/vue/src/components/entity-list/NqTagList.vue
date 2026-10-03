<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { TagHue } from "../badge";

export interface EntityTag {
  label: string;
  hue?: TagHue;
}
export interface Props {
  tags: readonly EntityTag[];
  /** Tags shown before "+N". Default 3. */
  max?: number;
  class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { formatNumber } from "../numeric";

// Tag chips with a "+N" overflow. The overflow chip lists the hidden tags in its title.
const props = withDefaults(defineProps<Props>(), { max: 3 });
const nq = useNasaq();
const shown = computed(() => props.tags.slice(0, props.max));
const hidden = computed(() => props.tags.slice(props.max));
</script>

<template>
  <span v-if="!props.tags.length" class="text-muted-foreground">—</span>
  <span v-else data-slot="tag-list" :class="cn('inline-flex flex-wrap items-center gap-1', props.class)">
    <NqBadge v-for="tag in shown" :key="tag.label" variant="tag" :hue="tag.hue ?? 'gray'">{{ tag.label }}</NqBadge>
    <NqBadge v-if="hidden.length" variant="outline" :title="hidden.map((tag) => tag.label).join(', ')" class="tabular-nums">+{{ formatNumber(hidden.length, nq.locale.value) }}</NqBadge>
  </span>
</template>
