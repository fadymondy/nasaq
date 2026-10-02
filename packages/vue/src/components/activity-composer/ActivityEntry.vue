<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqCheckbox } from "../checkbox";
import { NqCommentActionsMenu } from "../comment-thread";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqDateTime, formatNumber } from "../numeric";
import { ACTIVITY_ICONS, isOverdue, type ActivityRecord } from "./activity-logic";
import type { ActivityLabels } from "./strings";

// One row of the activity timeline: the NqTimelineItem markup on a context-menu region, so the whole row opens the actions.
// Internal to NqActivityTimeline.
const props = defineProps<{
  a: ActivityRecord;
  planned: boolean;
  clock: number;
  locale: string;
  t: Required<ActivityLabels> & { minutes: (n: string) => string; complete: (s: string) => string; reopen: (s: string) => string };
  actions: readonly ContextMenuAction[];
  toggleable: boolean;
}>();
const emit = defineEmits<{ toggle: [done: boolean] }>();
const Glyph = computed(() => ACTIVITY_ICONS[props.a.kind]);
const overdue = computed(() => isOverdue(props.a, props.clock));
const checkLabel = computed(() => (props.a.done ? props.t.reopen(props.a.body) : props.t.complete(props.a.body)));
</script>

<template>
  <NqContextMenuActions as="li" :actions="props.actions" data-slot="timeline-item" class="group/timeline grid grid-cols-[2rem_1fr] gap-x-3">
    <div class="flex flex-col items-center">
      <span data-slot="timeline-marker" class="flex size-8 shrink-0 items-center justify-center">
        <span class="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4"><component :is="Glyph" aria-hidden="true" /></span>
      </span>
      <span aria-hidden="true" data-slot="timeline-rail" class="my-1 w-px flex-1 bg-border group-last/timeline:hidden" />
    </div>
    <div data-slot="timeline-content" class="flex min-w-0 flex-col gap-1 pb-6 pt-1 group-last/timeline:pb-0">
      <div class="flex items-baseline justify-between gap-3">
        <p class="min-w-0 text-body-sm font-medium text-foreground">
          <span v-if="props.a.kind === 'event'" class="font-normal text-muted-foreground">{{ props.a.body }}</span>
          <span v-else class="flex flex-wrap items-center gap-2">
            {{ props.t.kinds[props.a.kind] }}
            <NqBadge v-if="props.a.durationMinutes" variant="outline">{{ props.t.minutes(formatNumber(props.a.durationMinutes, props.locale)) }}</NqBadge>
            <NqBadge v-if="overdue" variant="danger">{{ props.t.overdue }}</NqBadge>
            <NqBadge v-if="props.a.kind === 'task' && props.a.done" variant="success">{{ props.t.completed }}</NqBadge>
          </span>
        </p>
        <NqDateTime :value="props.a.at" relative class="shrink-0 text-caption text-muted-foreground" />
      </div>
      <p v-if="props.a.kind === 'event' ? !!props.a.actor : true" class="text-body-sm text-muted-foreground">
        <span v-if="props.a.kind === 'event'">{{ props.t.by }} {{ props.a.actor?.name }}</span>
        <span v-else dir="auto" :class="cn('block whitespace-pre-wrap text-foreground', props.a.kind === 'task' && props.a.done && 'text-muted-foreground line-through')">{{ props.a.body }}</span>
      </p>
      <div v-if="(props.a.actor && props.a.kind !== 'event') || (props.a.kind === 'task' && props.toggleable) || props.actions.length > 0" class="flex flex-wrap items-center gap-2">
        <span v-if="props.a.actor && props.a.kind !== 'event'" class="text-caption text-muted-foreground">{{ props.t.by }} {{ props.a.actor.name }}</span>
        <label v-if="props.a.kind === 'task' && props.toggleable" class="flex items-center gap-2 text-body-sm text-foreground">
          <NqCheckbox :model-value="!!props.a.done" :aria-label="checkLabel" @update:model-value="(v: boolean) => emit('toggle', v)" />
          {{ props.a.done ? props.t.completed : props.planned ? props.t.due : "" }}
        </label>
        <NqCommentActionsMenu v-if="props.actions.length > 0" :actions="props.actions" :label="props.t.actions" />
      </div>
    </div>
  </NqContextMenuActions>
</template>
