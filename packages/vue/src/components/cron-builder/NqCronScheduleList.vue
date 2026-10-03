<script lang="ts">
export type ScheduleRunStatus = "ok" | "failed" | "missed";

export interface CronSchedule {
  id: string;
  name: string;
  /** Cron expression. */
  cron: string;
  timeZone?: string;
  enabled: boolean;
  /** The last time it was due: `ok` it ran, `failed` it ran and errored, `missed` nothing ran at its time. */
  lastRun?: { at: Date | number | string; status: ScheduleRunStatus; message?: string };
}
</script>

<script setup lang="ts">
import { CalendarClock, Pencil, Play } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqConfirmButton } from "../alert-dialog";
import { NqButton } from "../button";
import { NqDateTime, type FormatDateOptions } from "../numeric";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqStatus } from "../status";
import type { StatusTone } from "../status";
import { NqSwitch } from "../switch";
import { describeCron, isValidTimeZone, nextRuns, parseCron } from "./cron";
import { SCHEDULE_STRINGS, type CronScheduleListLabels } from "./strings";

// The schedules you have: what each one says in words, its status the last time it was due (ran, failed or missed;
// shown with an icon and a word), when it runs next, and pause, run now, edit and delete.
type Result = void | { error?: string };
const props = withDefaults(defineProps<{
  schedules: readonly CronSchedule[];
  /** Pause or resume. Without it the switch is disabled. */
  onToggle?: (schedule: CronSchedule, enabled: boolean) => Promise<Result>;
  /** Shows the "run now" button. */
  onRunNow?: (schedule: CronSchedule) => Promise<Result>;
  /** Shows the edit button. */
  onEdit?: (schedule: CronSchedule) => void;
  /** Shows the delete button; it asks first. */
  onDelete?: (schedule: CronSchedule) => Promise<Result>;
  /** The moment "next run" counts from. Default: now. */
  now?: Date | number;
  loading?: boolean;
  /** Override any English or Arabic string. */
  labels?: Partial<CronScheduleListLabels>;
  class?: HTMLAttributes["class"];
}>(), { onToggle: undefined, onRunNow: undefined, onEdit: undefined, onDelete: undefined, now: undefined, labels: undefined });

const TONE: Record<ScheduleRunStatus, StatusTone> = { ok: "success", failed: "danger", missed: "warning" };

const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const lang = computed(() => (ar.value ? "ar" : "en"));
const t = computed(() => ({ ...SCHEDULE_STRINGS[lang.value], ...props.labels }));
const busy = ref<string | null>(null);
const error = ref<string | null>(null);

const zoneOf = (s: CronSchedule) => (s.timeZone && isValidTimeZone(s.timeZone) ? s.timeZone : "UTC");
const upcoming = computed(
  () => new Map(props.schedules.map((s) => [s.id, s.enabled ? nextRuns(s.cron, { from: props.now ?? Date.now(), count: 1, timeZone: zoneOf(s) })[0] : undefined])),
);
const words = (s: CronSchedule) => describeCron(s.cron, lang.value);
const readable = (s: CronSchedule) => words(s) ?? (parseCron(s.cron).ok ? t.value.custom : t.value.invalid);
const nextFormat = (s: CronSchedule): FormatDateOptions => ({ dateStyle: "medium", timeStyle: "short", timeZone: zoneOf(s) });

async function act(id: string, run: () => Promise<Result>) {
  busy.value = id;
  error.value = null;
  const res = await run();
  busy.value = null;
  if (res && res.error) error.value = res.error;
}
</script>

<template>
  <div v-if="props.loading" data-slot="cron-schedule-list" aria-busy="true" :class="cn('flex flex-col gap-2', props.class)">
    <NqSkeleton v-for="i in 3" :key="i" class="h-16" />
  </div>
  <div v-else-if="props.schedules.length === 0" data-slot="cron-schedule-list" :class="props.class">
    <NqEmptyState :icon="CalendarClock" :title="t.empty" :description="t.emptyBody" />
  </div>
  <div v-else data-slot="cron-schedule-list" :class="cn('flex flex-col gap-2', props.class)">
    <p v-if="error" role="alert" class="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">{{ error }}</p>
    <ul :aria-label="t.label" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
      <li v-for="s in props.schedules" :key="s.id" :data-schedule="s.id" :class="cn('flex flex-wrap items-center gap-x-4 gap-y-3 p-4', !s.enabled && 'opacity-80')">
        <NqSwitch
          :model-value="s.enabled"
          :disabled="!props.onToggle || busy === s.id"
          :aria-label="t.enable(s.name)"
          @update:model-value="(v: boolean) => props.onToggle && void act(s.id, () => props.onToggle!(s, v))"
        />
        <div class="min-w-0 flex-1 basis-56">
          <p class="truncate text-label text-foreground">{{ s.name }}</p>
          <p class="text-body-sm text-muted-foreground">
            {{ readable(s) }}
            <bdi dir="ltr" class="ms-2 font-mono text-code">{{ s.cron }}</bdi>
            <bdi v-if="s.timeZone" dir="ltr" class="ms-2 text-caption">{{ s.timeZone }}</bdi>
          </p>
        </div>
        <dl class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-body-sm sm:min-w-64">
          <dt class="text-muted-foreground">{{ t.lastRun }}</dt>
          <dd class="min-w-0">
            <span v-if="s.lastRun" class="flex flex-wrap items-center gap-x-2">
              <NqStatus :tone="TONE[s.lastRun.status]">{{ t.status[s.lastRun.status] }}</NqStatus>
              <NqDateTime :value="s.lastRun.at" relative class="text-caption text-muted-foreground" />
            </span>
            <span v-else class="text-muted-foreground">{{ t.never }}</span>
          </dd>
          <dt class="text-muted-foreground">{{ t.nextRun }}</dt>
          <dd>
            <NqDateTime v-if="s.enabled && upcoming.get(s.id)" :value="upcoming.get(s.id)!" :format="nextFormat(s)" />
            <span v-else class="text-muted-foreground">{{ t.off }}</span>
          </dd>
        </dl>
        <div class="flex items-center gap-1">
          <NqButton v-if="props.onRunNow" variant="ghost" size="icon-sm" :aria-label="`${t.runNow}: ${s.name}`" :title="t.runNow" :disabled="busy === s.id" @click="void act(s.id, () => props.onRunNow!(s))">
            <Play aria-hidden="true" />
          </NqButton>
          <NqButton v-if="props.onEdit" variant="ghost" size="icon-sm" :aria-label="`${t.edit}: ${s.name}`" :title="t.edit" @click="props.onEdit!(s)">
            <Pencil aria-hidden="true" />
          </NqButton>
          <NqConfirmButton v-if="props.onDelete" variant="danger" size="sm" :title="t.removeTitle(s.name)" :description="t.removeBody" :confirm-label="t.remove" :on-confirm="() => act(s.id, () => props.onDelete!(s))">
            {{ t.remove }}
          </NqConfirmButton>
        </div>
      </li>
    </ul>
  </div>
</template>
