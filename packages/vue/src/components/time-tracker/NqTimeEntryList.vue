<script setup lang="ts">
import { Clock, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { formatDate } from "../numeric";
import { NqEmptyState } from "../states";
import NqTimeEntryDialog from "./NqTimeEntryDialog.vue";
import { formatHours, fromDateKey, sumSeconds } from "./time-math";
import { useTimeTrackerStrings, type TimeTrackerLabels } from "./strings";
import { lookupTime, type TimeEntry, type TimeEntryInput, type TimeProject, type TimeResult } from "./types";

// Entries grouped by day, newest first, with a total per day and add, edit and delete.
const props = withDefaults(
  defineProps<{
    entries: readonly TimeEntry[];
    projects: readonly TimeProject[];
    /** Add a manual entry. Omit to hide the add button and dialog. */
    onAdd?: (input: TimeEntryInput) => Promise<TimeResult> | TimeResult;
    onEdit?: (entry: TimeEntry, input: TimeEntryInput) => Promise<TimeResult> | TimeResult;
    onDelete?: (entry: TimeEntry) => Promise<TimeResult> | TimeResult;
    labels?: TimeTrackerLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { onAdd: undefined, onEdit: undefined, onDelete: undefined, labels: undefined },
);

const nq = useNasaq();
const t = useTimeTrackerStrings(() => props.labels);
const dialog = ref<{ open: boolean; entry: TimeEntry | null }>({ open: false, entry: null });
const titleId = `nq-time-entries-${useId()}`;

const groups = computed(() => {
  const map = new Map<string, TimeEntry[]>();
  for (const e of props.entries) map.set(e.date, [...(map.get(e.date) ?? []), e]);
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
});

const dayText = (day: string) => formatDate(fromDateKey(day), nq.locale.value, { weekday: "long", day: "numeric", month: "long" });
const label = (projectId: string, taskId?: string) => {
  const n = lookupTime(props.projects, projectId, taskId);
  return n.task ? `${n.project} / ${n.task}` : n.project;
};
const openDialog = (entry: TimeEntry | null) => (dialog.value = { open: true, entry });
const submit = (input: TimeEntryInput, entry?: TimeEntry | null) => (entry ? props.onEdit?.(entry, input) : props.onAdd?.(input));
</script>

<template>
  <section data-slot="time-entry-list" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3', props.class)">
    <div class="flex items-center justify-between gap-3">
      <h2 :id="titleId" class="text-title-sm text-foreground">{{ t.entries }}</h2>
      <NqButton v-if="props.onAdd" type="button" variant="secondary" size="sm" @click="openDialog(null)">
        <Plus aria-hidden="true" />
        {{ t.addEntry }}
      </NqButton>
    </div>
    <NqEmptyState v-if="groups.length === 0" :icon="Clock" :title="t.emptyTitle" :description="t.emptyDescription">
      <template v-if="props.onAdd" #actions>
        <NqButton type="button" variant="primary" size="sm" @click="openDialog(null)">
          <Plus aria-hidden="true" />
          {{ t.addEntry }}
        </NqButton>
      </template>
    </NqEmptyState>
    <NqCard v-for="[day, items] in groups" v-else :key="day">
      <NqCardHeader class="flex-row items-center justify-between gap-3">
        <NqCardTitle class="text-label">{{ dayText(day) }}</NqCardTitle>
        <span class="text-body-sm text-muted-foreground">
          {{ t.dayTotal }} <bdi dir="ltr" class="tabular-nums font-medium text-foreground">{{ formatHours(sumSeconds(items)) }}</bdi>
        </span>
      </NqCardHeader>
      <NqCardContent>
        <ul class="divide-y divide-border">
          <li v-for="e in items" :key="e.id" class="flex items-center gap-3 py-2">
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-body-sm font-medium text-foreground">{{ label(e.projectId, e.taskId) }}</span>
              <span v-if="e.note" class="truncate text-body-sm text-muted-foreground">{{ e.note }}</span>
            </div>
            <bdi dir="ltr" class="tabular-nums text-body-sm font-medium text-foreground">{{ formatHours(e.seconds) }}</bdi>
            <NqButton v-if="props.onEdit" type="button" variant="ghost" size="icon-sm" :aria-label="`${t.edit}: ${lookupTime(props.projects, e.projectId).project}`" @click="openDialog(e)">
              <Pencil aria-hidden="true" />
            </NqButton>
            <NqButton v-if="props.onDelete" type="button" variant="ghost" size="icon-sm" :aria-label="`${t.remove}: ${lookupTime(props.projects, e.projectId).project}`" @click="props.onDelete?.(e)">
              <Trash2 aria-hidden="true" />
            </NqButton>
          </li>
        </ul>
      </NqCardContent>
    </NqCard>
    <NqTimeEntryDialog
      v-if="props.onAdd || props.onEdit"
      :open="dialog.open"
      :projects="props.projects"
      :entry="dialog.entry"
      :labels="props.labels"
      :on-submit="submit as never"
      @update:open="(open) => (dialog = { ...dialog, open })"
    />
  </section>
</template>
