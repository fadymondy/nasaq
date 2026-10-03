<script lang="ts">
export interface ProjectScheduleText {
  label: string;
  empty: string;
  emptyHint: string;
  unscheduled: string;
  open: string;
  copyKey: string;
  actions: string;
  today: string;
}
</script>

<script setup lang="ts">
import { ExternalLink, Link2 } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqCommentActionsMenu } from "../comment-thread";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import type { Issue } from "../issue-view/issue-logic";
import NqStatusDot from "../issue-view/NqStatusDot.vue";
import { formatDate } from "../numeric";
import { NqEmptyState } from "../states";
import type { WorkStatus } from "../status-label-manager/status-label-logic";
import { addDays, rulerTicks, timelineBars, timelineRange } from "./project-logic";

// A light timeline: one bar per scheduled issue between its start and due date, a week ruler and a today line.
// Each row has a context menu (and a more button) with Open and Copy key.
const props = defineProps<{
  issues: readonly Issue[];
  statuses: readonly WorkStatus[];
  /** Civil "today", drawn as a line. */
  today: string;
  onOpenIssue?: (issue: Issue) => void;
  t: ProjectScheduleText;
}>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const range = computed(() => timelineRange(props.issues));
const bars = computed(() => (range.value ? new Map(timelineBars(props.issues, range.value, props.statuses).map((b) => [b.id, b])) : new Map<string, ReturnType<typeof timelineBars>[number]>()));
const scheduled = computed(() => props.issues.filter((i) => bars.value.has(i.id)));
const loose = computed(() => props.issues.filter((i) => !bars.value.has(i.id)));
const ticks = computed(() => (range.value ? rulerTicks(range.value) : []));
const todayAt = computed(() => {
  const r = range.value;
  if (!r || props.today < r.start || props.today > r.end) return null;
  return ((Date.parse(props.today) - Date.parse(r.start)) / (Date.parse(addDays(r.end, 1)) - Date.parse(r.start))) * 100;
});
const dateText = (key: string) => formatDate(new Date(`${key}T00:00:00`), locale.value, { day: "numeric", month: "short" });
const statusOf = computed(() => new Map(props.statuses.map((s) => [s.id, s])));

const actionsFor = (issue: Issue): ContextMenuAction[] => [
  ...(props.onOpenIssue ? [{ id: "open", label: props.t.open, icon: ExternalLink, onSelect: () => props.onOpenIssue?.(issue) }] : []),
  { id: "copy", label: props.t.copyKey, icon: Link2, onSelect: () => void navigator.clipboard?.writeText(issue.key) },
];
</script>

<template>
  <NqEmptyState v-if="!range || scheduled.length === 0" :title="props.t.empty" :description="props.t.emptyHint" />
  <div v-else data-slot="project-schedule" class="flex min-w-0 flex-col gap-4">
    <div role="group" :aria-label="props.t.label" class="min-w-0 overflow-x-auto rounded-card border border-border">
      <div class="min-w-[44rem]">
        <div class="grid grid-cols-[13rem_minmax(0,1fr)] border-b border-border bg-muted/40 text-caption text-muted-foreground">
          <div class="px-3 py-2" />
          <div class="relative h-8">
            <span v-for="tick in ticks" :key="tick.date" class="absolute top-2 whitespace-nowrap ps-1.5" :style="{ insetInlineStart: `${tick.offset}%` }">{{ dateText(tick.date) }}</span>
          </div>
        </div>
        <ul class="m-0 list-none p-0">
          <NqContextMenuActions
            v-for="issue in scheduled"
            :key="issue.id"
            as="li"
            :actions="actionsFor(issue)"
            class="grid grid-cols-[13rem_minmax(0,1fr)] items-center border-b border-border last:border-b-0"
          >
            <div class="flex min-w-0 items-center gap-2 px-3 py-2">
              <NqStatusDot :hue="statusOf.get(issue.statusId)?.hue" />
              <bdi dir="ltr" class="shrink-0 font-mono text-caption text-muted-foreground">{{ issue.key }}</bdi>
              <button type="button" class="min-w-0 flex-1 truncate text-start text-body-sm outline-none hover:underline focus-visible:underline" @click="props.onOpenIssue?.(issue)">{{ issue.title }}</button>
              <NqCommentActionsMenu :actions="actionsFor(issue)" :label="`${props.t.actions}: ${issue.key}`" />
            </div>
            <div class="relative h-9">
              <span v-if="todayAt !== null" aria-hidden="true" class="absolute inset-y-0 w-px bg-nq-danger" :style="{ insetInlineStart: `${todayAt}%` }" />
              <span
                role="img"
                :aria-label="`${issue.key}: ${dateText(bars.get(issue.id)!.start)} - ${dateText(bars.get(issue.id)!.end)}`"
                :class="cn('absolute top-2.5 h-4 rounded-full', bars.get(issue.id)!.done && 'opacity-60')"
                :style="{ insetInlineStart: `${bars.get(issue.id)!.offset}%`, inlineSize: `${bars.get(issue.id)!.width}%`, background: `var(--nq-tag-${statusOf.get(issue.statusId)?.hue ?? 'gray'})` }"
              />
            </div>
          </NqContextMenuActions>
        </ul>
      </div>
    </div>
    <p v-if="todayAt !== null" class="m-0 flex items-center gap-2 text-caption text-muted-foreground">
      <span aria-hidden="true" class="inline-block h-3 w-px bg-nq-danger" />
      {{ props.t.today }}
    </p>
    <p v-if="loose.length > 0" class="m-0 text-body-sm text-muted-foreground">
      {{ props.t.unscheduled }}: <bdi dir="ltr">{{ loose.map((i) => i.key).join(", ") }}</bdi>
    </p>
  </div>
</template>
