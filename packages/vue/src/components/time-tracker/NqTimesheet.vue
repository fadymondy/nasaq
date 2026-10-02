<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { formatDate, formatDateRange } from "../numeric";
import { NqTable, NqTableBody, NqTableCell, NqTableFooter, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { addDays, buildGrid, dateKey, formatHours, fromDateKey, startOfWeek, weekKeys } from "./time-math";
import { useTimeTrackerStrings, type TimeTrackerLabels } from "./strings";
import { lookupTime, type TimeEntry, type TimeProject, type TimesheetView } from "./types";

// Project and task rows by day columns, with hours per cell, per row and per day.
const props = withDefaults(
  defineProps<{
    entries: readonly TimeEntry[];
    projects: readonly TimeProject[];
    /** "day" or "week" (v-model:view). */
    view?: TimesheetView;
    defaultView?: TimesheetView;
    /** Any date inside the period being shown (v-model:date); defaults to today. */
    date?: Date;
    defaultDate?: Date;
    /** 0 Sunday … 6 Saturday. Defaults to Monday, or Saturday in Arabic. */
    weekStartsOn?: number;
    labels?: TimeTrackerLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { view: undefined, defaultView: "week", date: undefined, defaultDate: undefined, weekStartsOn: undefined, labels: undefined },
);
const emit = defineEmits<{ "update:view": [view: TimesheetView]; "update:date": [date: Date] }>();

const nq = useNasaq();
const t = useTimeTrackerStrings(() => props.labels);
const viewInner = ref<TimesheetView>(props.defaultView);
const dateInner = ref<Date>(props.defaultDate ?? new Date());
const view = computed(() => props.view ?? viewInner.value);
const date = computed(() => props.date ?? dateInner.value);
const titleId = `nq-timesheet-${useId()}`;

function setView(v: TimesheetView) {
  viewInner.value = v;
  emit("update:view", v);
}
function setDate(d: Date) {
  dateInner.value = d;
  emit("update:date", d);
}

const ar = computed(() => nq.locale.value.startsWith("ar"));
const start = computed(() => startOfWeek(date.value, props.weekStartsOn ?? (ar.value ? 6 : 1)));
const days = computed(() => (view.value === "week" ? weekKeys(start.value) : [dateKey(date.value)]));
const step = computed(() => (view.value === "week" ? 7 : 1));
const todayKey = dateKey(new Date());
const grid = computed(() => buildGrid(props.entries, days.value, (e) => `${e.projectId}\u0000${e.taskId ?? ""}`));
const range = computed(() =>
  view.value === "week"
    ? formatDateRange(fromDateKey(days.value[0] ?? dateKey(date.value)), fromDateKey(days.value[6] ?? dateKey(date.value)), nq.locale.value, { month: "short", day: "numeric" })
    : formatDate(date.value, nq.locale.value, { weekday: "long", day: "numeric", month: "long" }),
);
const colLabel = (d: string) => (view.value === "week" ? formatDate(fromDateKey(d), nq.locale.value, { weekday: "short", day: "numeric" }) : t.value.duration);
const rowLabel = (key: string) => {
  const [projectId = "", taskId = ""] = key.split("\u0000");
  const n = lookupTime(props.projects, projectId, taskId || undefined);
  return n.task ? `${n.project} / ${n.task}` : n.project;
};
</script>

<template>
  <section data-slot="timesheet" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 :id="titleId" class="text-title-sm text-foreground">{{ t.timesheet }}</h2>
      <div class="flex flex-wrap items-center gap-2">
        <NqToggleGroup :aria-label="t.view" :model-value="[view]" @update:model-value="(v) => v[0] && setView(v[0] as TimesheetView)">
          <NqToggle value="day">{{ t.day }}</NqToggle>
          <NqToggle value="week">{{ t.week }}</NqToggle>
        </NqToggleGroup>
        <div class="flex items-center gap-1">
          <NqButton type="button" variant="secondary" size="icon-sm" :aria-label="t.previous" @click="setDate(addDays(date, -step))">
            <ChevronLeft aria-hidden="true" class="rtl:rotate-180" />
          </NqButton>
          <NqButton type="button" variant="secondary" size="sm" @click="setDate(new Date())">{{ t.today }}</NqButton>
          <NqButton type="button" variant="secondary" size="icon-sm" :aria-label="t.next" @click="setDate(addDays(date, step))">
            <ChevronRight aria-hidden="true" class="rtl:rotate-180" />
          </NqButton>
        </div>
      </div>
    </div>
    <p aria-live="polite" class="text-body-sm text-muted-foreground">{{ range }}</p>
    <NqCard>
      <NqTable :label="t.gridLabel">
        <NqTableHeader>
          <NqTableRow>
            <NqTableHead>{{ t.row }}</NqTableHead>
            <NqTableHead v-for="d in days" :key="d" :class="cn('text-end', d === todayKey && 'text-foreground')" :aria-current="d === todayKey ? 'date' : undefined">{{ colLabel(d) }}</NqTableHead>
            <NqTableHead v-if="view === 'week'" class="text-end">{{ t.total }}</NqTableHead>
          </NqTableRow>
        </NqTableHeader>
        <NqTableBody>
          <NqTableRow v-if="grid.rows.length === 0">
            <NqTableCell :colspan="days.length + (view === 'week' ? 2 : 1)" class="py-8 text-center text-muted-foreground">{{ t.emptyGrid }}</NqTableCell>
          </NqTableRow>
          <NqTableRow v-for="row in grid.rows" v-else :key="row.key">
            <NqTableCell class="font-medium">{{ rowLabel(row.key) }}</NqTableCell>
            <NqTableCell v-for="d in days" :key="d" class="text-end">
              <bdi v-if="row.cells[d]" dir="ltr" class="tabular-nums">{{ formatHours(row.cells[d]!) }}</bdi>
              <span v-else aria-hidden="true" class="text-muted-foreground">-</span>
            </NqTableCell>
            <NqTableCell v-if="view === 'week'" class="text-end font-medium">
              <bdi dir="ltr" class="tabular-nums">{{ formatHours(row.total) }}</bdi>
            </NqTableCell>
          </NqTableRow>
        </NqTableBody>
        <NqTableFooter v-if="grid.rows.length">
          <NqTableRow>
            <NqTableCell class="font-semibold">{{ t.total }}</NqTableCell>
            <NqTableCell v-for="d in days" :key="d" class="text-end font-semibold">
              <bdi dir="ltr" class="tabular-nums">{{ formatHours(grid.columns[d] ?? 0) }}</bdi>
            </NqTableCell>
            <NqTableCell v-if="view === 'week'" class="text-end font-semibold">
              <bdi dir="ltr" class="tabular-nums">{{ formatHours(grid.total) }}</bdi>
            </NqTableCell>
          </NqTableRow>
        </NqTableFooter>
      </NqTable>
    </NqCard>
  </section>
</template>
