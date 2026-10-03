<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import type { KanbanCardData } from "./kanban-types";

// The default card body: title, coloured labels and the assignee's avatar.
interface Props {
  card: KanbanCardData;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <div data-slot="kanban-card" :class="cn('flex flex-col gap-2 rounded-card border border-border bg-card p-3 text-card-foreground', props.class)">
    <div v-if="props.card.labels?.length" class="flex flex-wrap gap-1">
      <NqBadge v-for="l in props.card.labels" :key="l.label" variant="tag" :hue="l.hue ?? 'gray'">{{ l.label }}</NqBadge>
    </div>
    <div class="text-label text-foreground">{{ props.card.title }}</div>
    <div v-if="props.card.assignee" class="flex items-center justify-end">
      <NqAvatar :name="props.card.assignee.name" :src="props.card.assignee.src" size="xs" />
    </div>
  </div>
</template>
