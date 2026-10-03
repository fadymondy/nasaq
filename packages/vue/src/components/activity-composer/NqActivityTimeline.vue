<script setup lang="ts">
import { CalendarClock, CircleCheck, Trash2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import type { ContextMenuAction } from "../context-menu";
import { NqNum } from "../numeric";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqTimeline } from "../timeline";
import ActivityEntry from "./ActivityEntry.vue";
import { splitActivities, type ActivityRecord } from "./activity-logic";
import { useActivityLabels, type ActivityLabels, type ActivityResult } from "./strings";

// The history of a record: open tasks first under Planned (soonest due first, overdue flagged), then everything that
// happened, newest first. Tasks tick off in place and move into the history. Entries have a context menu.
const props = withDefaults(
  defineProps<{
    activities: readonly ActivityRecord[];
    /** Tick or untick a task. Omit for read-only tasks. */
    onToggleTask?: (id: string, done: boolean) => Promise<ActivityResult>;
    /** Delete an entry. Omit to hide Delete. */
    onDelete?: (id: string) => Promise<ActivityResult>;
    /** "Now" for overdue tasks. Default the current time. */
    now?: number;
    loading?: boolean;
    labels?: ActivityLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { onToggleTask: undefined, onDelete: undefined, now: undefined, loading: false, labels: undefined },
);
const { t, locale } = useActivityLabels(() => props.labels);
const parts = computed(() => splitActivities(props.activities));
const error = ref<string | null>(null);
const clock = computed(() => props.now ?? Date.now());

async function run(fn: () => Promise<ActivityResult>) {
  error.value = null;
  const r = await fn();
  if (r && "error" in r && r.error) error.value = r.error;
}

function actionsOf(a: ActivityRecord): ContextMenuAction[] {
  const list: ContextMenuAction[] = [];
  const toggle = props.onToggleTask;
  const remove = props.onDelete;
  if (a.kind === "task" && toggle) {
    list.push({ id: "toggle", label: a.done ? t.value.reopen(a.body) : t.value.complete(a.body), icon: CircleCheck, onSelect: () => void run(() => toggle(a.id, !a.done)) });
  }
  if (remove) list.push({ id: "delete", label: t.value.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => void run(() => remove(a.id)) });
  return list;
}
function toggle(a: ActivityRecord, done: boolean) {
  const fn = props.onToggleTask;
  if (fn) void run(() => fn(a.id, done));
}
</script>

<template>
  <div v-if="props.loading" data-slot="activity-timeline" aria-busy="true" :class="cn('flex flex-col gap-4', props.class)">
    <NqSkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
  </div>
  <div v-else data-slot="activity-timeline" :class="cn('flex min-w-0 flex-col gap-5', props.class)">
    <slot v-if="props.activities.length === 0" name="empty">
      <NqEmptyState :icon="CalendarClock" :title="t.empty" :description="t.emptyHint" />
    </slot>
    <template v-else>
      <section v-if="parts.open.length > 0" :aria-label="t.plannedLabel" class="flex flex-col gap-2">
        <h3 class="flex items-center gap-2 text-label text-foreground">
          {{ t.planned }}
          <NqBadge variant="outline"><NqNum :value="parts.open.length" /></NqBadge>
        </h3>
        <NqTimeline>
          <ActivityEntry v-for="a in parts.open" :key="a.id" :a="a" planned :clock="clock" :locale="locale" :t="t as never" :actions="actionsOf(a)" :toggleable="!!props.onToggleTask" @toggle="(d) => toggle(a, d)" />
        </NqTimeline>
      </section>
      <section v-if="parts.history.length > 0" :aria-label="t.listLabel" class="flex flex-col gap-2">
        <h3 class="text-label text-foreground">{{ t.history }}</h3>
        <NqTimeline>
          <ActivityEntry v-for="a in parts.history" :key="a.id" :a="a" :planned="false" :clock="clock" :locale="locale" :t="t as never" :actions="actionsOf(a)" :toggleable="!!props.onToggleTask" @toggle="(d) => toggle(a, d)" />
        </NqTimeline>
      </section>
    </template>
    <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
  </div>
</template>
