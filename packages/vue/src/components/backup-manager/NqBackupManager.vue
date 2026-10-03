<script setup lang="ts">
import { Archive, CalendarClock, CircleAlert, Download, HardDrive, Lock, Play, RotateCcw, Trash2 } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqConfirmButton } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { formatNumber, NqDateTime } from "../numeric";
import { NqProgress } from "../progress";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { NqSwitch } from "../switch";
import {
  clampPercent,
  formatBytes,
  nextRun,
  parseTime,
  pruneCandidates,
  totalSize,
  validateRetention,
  type BackupFrequency,
  type BackupRetention,
  type BackupSchedule,
  type BackupStatus,
  type DateLike,
} from "./backup-format";
import NqRestoreDialog from "./NqRestoreDialog.vue";
import { STRINGS, type BackupManagerLabels } from "./strings";
import type { BackupRecord, BackupResult } from "./types";

// Backups in one place: a summary (last backup, next run, storage), the history with progress for a running
// backup or restore, run now, download, delete and a restore that needs a confirmation, and a form for the
// schedule (hourly to monthly) and retention (keep the last N, delete after N days) with a live preview of
// what retention would remove. It is presentational: your callbacks talk to the server and you pass `backups` back.
interface Props {
  backups: readonly BackupRecord[];
  schedule: BackupSchedule;
  retention: BackupRetention;
  loading?: boolean;
  /** Start a backup. Resolve, or resolve `{ error }` to show it. The host then adds a `running` backup to `backups`. */
  onRunNow: () => Promise<BackupResult>;
  /** Restore this backup, after the confirm. */
  onRestore: (id: string) => Promise<BackupResult>;
  /** Save the schedule and retention. */
  onSaveSchedule: (next: { schedule: BackupSchedule; retention: BackupRetention }) => Promise<BackupResult>;
  /** Delete a backup. Shows Delete on finished backups. */
  onDelete?: (id: string) => Promise<BackupResult>;
  /** Download a backup. Shows Download on completed backups. */
  onDownload?: (id: string) => Promise<BackupResult>;
  /** Whether a safety backup is taken before a restore. Only changes the wording. Default true. */
  safetyBackup?: boolean;
  /** Override "now" (tests and stories). */
  now?: DateLike;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<BackupManagerLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { loading: false, safetyBackup: true, onDelete: undefined, onDownload: undefined, now: undefined, labels: undefined });

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed<BackupManagerLabels>(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const error = ref<string | null>(null);
const notice = ref<string | null>(null);
const starting = ref(false);
const restoring = ref<BackupRecord | null>(null);

const draft = ref<BackupSchedule>({ ...props.schedule });
const keepLast = ref(String(props.retention.keepLast));
const maxAge = ref(String(props.retention.maxAgeDays ?? 0));
const saving = ref(false);
watch(() => props.schedule, (s) => (draft.value = { ...s }));
watch(
  () => props.retention,
  (r) => {
    keepLast.value = String(r.keepLast);
    maxAge.value = String(r.maxAgeDays ?? 0);
  },
);

const dateFmt = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short", numberingSystem: "latn" }));
const fmtDate = (d: DateLike) => dateFmt.value.format(new Date(d));
const weekdays = computed(() => Array.from({ length: 7 }, (_, d) => new Intl.DateTimeFormat(locale.value, { weekday: "long" }).format(new Date(2024, 0, 7 + d))));

const statusTone: Record<BackupStatus, StatusTone> = { completed: "success", running: "info", failed: "danger", restoring: "info" };
const backupName = (b: BackupRecord) => b.name ?? fmtDate(b.createdAt);
const isActive = (b: BackupRecord) => b.status === "running" || b.status === "restoring";
const pct = (b: BackupRecord) => (b.progress === undefined ? undefined : formatNumber(clampPercent(b.progress) / 100, locale.value, { style: "percent" }));

const sorted = computed(() => [...props.backups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
const busy = computed(() => props.backups.some(isActive));
const last = computed(() => sorted.value.find((b) => b.status === "completed" || b.status === "failed"));
const next = computed(() => nextRun(props.schedule, props.now));

const keepNum = computed(() => Number(keepLast.value));
const ageNum = computed(() => Number(maxAge.value));
const retentionDraft = computed<BackupRetention>(() => ({ keepLast: keepNum.value, maxAgeDays: ageNum.value }));
const retentionError = computed(() => validateRetention(retentionDraft.value));
const timeError = computed(() => (parseTime(draft.value.time) ? null : t.value.timeInvalid));
const norm = (s: BackupSchedule) => JSON.stringify({ ...s, dayOfWeek: s.frequency === "weekly" ? (s.dayOfWeek ?? 0) : undefined });
const dirty = computed(() => norm(draft.value) !== norm(props.schedule) || keepNum.value !== props.retention.keepLast || ageNum.value !== (props.retention.maxAgeDays ?? 0));
const prunable = computed(() => (retentionError.value ? [] : pruneCandidates(props.backups, retentionDraft.value, props.now)));

const freqItems = computed(() => (Object.keys(t.value.frequencies) as BackupFrequency[]).map((value) => ({ value, label: t.value.frequencies[value] })));
const dayItems = computed(() => weekdays.value.map((label, i) => ({ value: String(i), label })));
const completedCount = computed(() => props.backups.filter((b) => b.status === "completed").length);

async function run(fn: () => Promise<BackupResult>) {
  error.value = null;
  notice.value = null;
  try {
    const result = await fn();
    if (result && result.error) {
      error.value = result.error;
      return false;
    }
    return true;
  } catch {
    error.value = t.value.genericError;
    return false;
  }
}

async function runNow() {
  starting.value = true;
  await run(props.onRunNow);
  starting.value = false;
}

async function save() {
  if (retentionError.value || timeError.value) return;
  saving.value = true;
  const ok = await run(() => props.onSaveSchedule({ schedule: draft.value, retention: retentionDraft.value }));
  saving.value = false;
  if (ok) notice.value = t.value.saved;
}

const setFrequency = (v: unknown) => v && (draft.value = { ...draft.value, frequency: v as BackupFrequency });
const setDay = (v: unknown) => v !== undefined && v !== null && (draft.value = { ...draft.value, dayOfWeek: Number(v) });
const setTime = (v: string | number | undefined) => (draft.value = { ...draft.value, time: String(v ?? "") });
const setEnabled = (v: boolean) => (draft.value = { ...draft.value, enabled: v });
</script>

<template>
  <NqCard data-slot="backup-manager" :class="cn('w-full max-w-5xl', props.class)">
    <NqCardHeader class="sm:flex sm:items-start sm:justify-between sm:gap-4">
      <div class="flex flex-col gap-1.5">
        <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
        <NqCardDescription>{{ t.description }}</NqCardDescription>
      </div>
      <NqButton type="button" variant="primary" class="mt-3 sm:mt-0" :loading="starting" :disabled="busy || starting" @click="runNow">
        <Play aria-hidden="true" />
        {{ busy ? t.running : t.runNow }}
      </NqButton>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-5">
      <NqAlert v-if="error" tone="danger" dismissible @dismiss="error = null">{{ error }}</NqAlert>
      <NqAlert v-if="notice" tone="success" dismissible @dismiss="notice = null">{{ notice }}</NqAlert>

      <dl data-slot="backup-summary" class="grid gap-3 sm:grid-cols-3">
        <div class="flex flex-col gap-1 rounded-card border border-border p-3">
          <dt class="flex items-center gap-1.5 text-caption text-muted-foreground"><Archive aria-hidden="true" class="size-3.5" />{{ t.lastBackup }}</dt>
          <dd class="flex flex-col gap-0.5">
            <template v-if="last">
              <NqStatus :tone="statusTone[last.status]">{{ t.status[last.status] }}</NqStatus>
              <NqDateTime :value="last.createdAt" relative class="text-caption text-muted-foreground" />
            </template>
            <span v-else class="text-body-sm text-muted-foreground">{{ t.never }}</span>
          </dd>
        </div>
        <div class="flex flex-col gap-1 rounded-card border border-border p-3">
          <dt class="flex items-center gap-1.5 text-caption text-muted-foreground"><CalendarClock aria-hidden="true" class="size-3.5" />{{ t.nextRun }}</dt>
          <dd class="text-body-sm text-foreground">
            <NqDateTime v-if="next" :value="next" :format="{ dateStyle: 'medium', timeStyle: 'short' }" />
            <span v-else class="text-muted-foreground">{{ t.scheduleOff }}</span>
          </dd>
        </div>
        <div class="flex flex-col gap-1 rounded-card border border-border p-3">
          <dt class="flex items-center gap-1.5 text-caption text-muted-foreground"><HardDrive aria-hidden="true" class="size-3.5" />{{ t.storage }}</dt>
          <dd class="flex flex-col gap-0.5">
            <span dir="ltr" class="w-fit text-body-sm tabular-nums text-foreground">{{ formatBytes(totalSize(props.backups)) }}</span>
            <span class="text-caption text-muted-foreground">{{ t.backupsCount(completedCount) }}</span>
          </dd>
        </div>
      </dl>

      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="backup-history" class="flex min-w-0 flex-col gap-3">
          <h3 id="backup-history" class="text-h4 text-foreground">{{ t.listTitle }}</h3>
          <div v-if="props.loading" role="status" :aria-label="t.loading" class="flex flex-col gap-3">
            <NqSkeleton v-for="i in 4" :key="i" class="h-16 w-full" />
          </div>
          <NqEmptyState v-else-if="sorted.length === 0" :icon="Archive" :title="t.emptyTitle" :description="t.emptyBody" />
          <ul v-else :aria-label="t.list" class="overflow-hidden rounded-card border border-border">
            <li
              v-for="b in sorted"
              :key="b.id"
              data-slot="backup"
              :data-status="b.status"
              class="flex flex-col gap-3 border-t border-border px-4 py-3 first:border-t-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="flex min-w-0 flex-1 flex-col gap-2">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="text-label text-foreground" dir="auto">{{ backupName(b) }}</span>
                  <NqBadge variant="outline">{{ t.kind[b.kind] }}</NqBadge>
                  <span v-if="b.locked" :title="t.locked" class="inline-flex text-muted-foreground"><Lock :aria-label="t.locked" role="img" class="size-3.5" /></span>
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                  <NqStatus :tone="statusTone[b.status]">{{ t.status[b.status] }}</NqStatus>
                  <span v-if="b.sizeBytes != null && b.status !== 'running'" dir="ltr" class="tabular-nums">{{ formatBytes(b.sizeBytes) }}</span>
                  <NqDateTime v-if="b.name" :value="b.createdAt" relative />
                </div>
                <NqProgress
                  v-if="isActive(b)"
                  :aria-label="t.progressFor(backupName(b))"
                  :value="b.progress === undefined ? null : clampPercent(b.progress)"
                  size="sm"
                  tone="info"
                  show-value
                  :value-text="pct(b)"
                />
                <p v-if="b.status === 'failed' && b.error" class="flex items-center gap-1.5 text-caption text-nq-danger-text">
                  <CircleAlert aria-hidden="true" class="size-3.5 shrink-0" />
                  <span dir="auto">{{ b.error }}</span>
                </p>
              </div>
              <div v-if="!isActive(b)" role="group" :aria-label="t.actionsFor(backupName(b))" class="flex shrink-0 flex-wrap gap-2">
                <NqButton v-if="b.status === 'completed'" type="button" size="sm" variant="secondary" :disabled="busy" :aria-label="t.restoreFor(backupName(b))" @click="restoring = b">
                  <RotateCcw aria-hidden="true" class="rtl:-scale-x-100" />
                  {{ t.restore }}
                </NqButton>
                <NqButton
                  v-if="b.status === 'completed' && props.onDownload"
                  type="button"
                  size="sm"
                  variant="ghost"
                  :aria-label="t.downloadFor(backupName(b))"
                  @click="run(() => props.onDownload!(b.id))"
                >
                  <Download aria-hidden="true" />
                  {{ t.download }}
                </NqButton>
                <NqConfirmButton
                  v-if="props.onDelete"
                  size="sm"
                  variant="danger"
                  :aria-label="t.removeFor(backupName(b))"
                  :title="t.deleteTitle(backupName(b))"
                  :description="t.deleteBody"
                  :confirm-label="t.deleteConfirm"
                  :on-confirm="() => run(() => props.onDelete!(b.id))"
                >
                  <Trash2 aria-hidden="true" />
                  {{ t.remove }}
                </NqConfirmButton>
              </div>
            </li>
          </ul>
        </section>

        <section aria-labelledby="backup-schedule" data-slot="backup-schedule" class="flex flex-col gap-4 rounded-card border border-border p-4 lg:self-start">
          <div class="flex flex-col gap-1">
            <h3 id="backup-schedule" class="text-h4 text-foreground">{{ t.scheduleTitle }}</h3>
            <p class="text-body-sm text-muted-foreground">{{ t.scheduleBody }}</p>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span id="backup-enabled" class="text-label text-foreground">{{ t.enabled }}</span>
            <NqSwitch aria-labelledby="backup-enabled" :model-value="draft.enabled" @update:model-value="setEnabled" />
          </div>
          <fieldset :disabled="!draft.enabled" class="m-0 grid gap-4 border-0 p-0 disabled:opacity-60">
            <NqField>
              <NqFieldLabel>{{ t.frequency }}</NqFieldLabel>
              <NqSelect :model-value="draft.frequency" @update:model-value="setFrequency">
                <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="o in freqItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
            <NqField v-if="draft.frequency === 'weekly'">
              <NqFieldLabel>{{ t.weekday }}</NqFieldLabel>
              <NqSelect :model-value="String(draft.dayOfWeek ?? 0)" @update:model-value="setDay">
                <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="o in dayItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
            <NqField :invalid="Boolean(timeError)">
              <NqFieldLabel>{{ draft.frequency === "hourly" ? t.minute : t.time }}</NqFieldLabel>
              <NqInput ltr type="time" :model-value="draft.time" @update:model-value="setTime" />
              <NqFieldError v-if="timeError" match>{{ timeError }}</NqFieldError>
              <NqFieldDescription v-else-if="draft.frequency === 'monthly'">{{ t.monthlyHint }}</NqFieldDescription>
            </NqField>
          </fieldset>
          <div class="flex flex-col gap-1 border-t border-border pt-4">
            <h4 class="text-label text-foreground">{{ t.retentionTitle }}</h4>
            <p class="text-caption text-muted-foreground">{{ t.retentionBody }}</p>
          </div>
          <NqField :invalid="retentionError === 'keepLast'">
            <NqFieldLabel>{{ t.keepLast }} <span class="text-muted-foreground">({{ t.keepLastSuffix }})</span></NqFieldLabel>
            <NqInput v-model="keepLast" ltr inputmode="numeric" />
            <NqFieldError v-if="retentionError === 'keepLast'" match>{{ t.errors.keepLast }}</NqFieldError>
          </NqField>
          <NqField :invalid="retentionError === 'maxAgeDays'">
            <NqFieldLabel>{{ t.maxAge }}</NqFieldLabel>
            <NqInput v-model="maxAge" ltr inputmode="numeric" />
            <NqFieldError v-if="retentionError === 'maxAgeDays'" match>{{ t.errors.maxAgeDays }}</NqFieldError>
            <NqFieldDescription v-else>{{ t.maxAgeHint }}</NqFieldDescription>
          </NqField>
          <p v-if="!retentionError" role="status" data-slot="backup-prune" class="text-caption text-muted-foreground">{{ t.prune(prunable.length) }}</p>
          <NqButton type="button" variant="primary" :disabled="!dirty || Boolean(retentionError) || Boolean(timeError)" :loading="saving" @click="save">{{ t.save }}</NqButton>
        </section>
      </div>
    </NqCardContent>
    <NqRestoreDialog
      :backup="restoring"
      :name="restoring ? backupName(restoring) : ''"
      :safety="props.safetyBackup"
      :t="t"
      :on-confirm="async (id: string) => { await run(() => props.onRestore(id)); }"
      @close="restoring = null"
    />
  </NqCard>
</template>
