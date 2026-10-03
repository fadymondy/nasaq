<script setup lang="ts">
import { Play, Square } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqField, NqFieldLabel, NqInput } from "../field";
import NqTimeTaskPicker from "./NqTimeTaskPicker.vue";
import { formatClock } from "./time-math";
import { useTimeTrackerStrings, type TimeTrackerLabels } from "./strings";
import { lookupTime, type RunningTimer, type StoppedTimer, type TimeProject, type TimerSelection, type TimeResult } from "./types";

// The running timer: pick a project and task, add a note, press start. The clock derives from the start time, so it survives remounts.
const props = withDefaults(
  defineProps<{
    projects: readonly TimeProject[];
    /** Controlled running timer (v-model:running; null when stopped). */
    running?: RunningTimer | null;
    defaultRunning?: RunningTimer | null;
    /** Start; return `{ error }` to stay stopped and show the message. */
    onStart?: (selection: TimerSelection & { startedAt: number }) => Promise<TimeResult> | TimeResult;
    /** Stop; receives the elapsed whole seconds. Return `{ error }` to keep the timer running. */
    onStop?: (stopped: StoppedTimer) => Promise<TimeResult> | TimeResult;
    labels?: TimeTrackerLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { running: undefined, defaultRunning: null, onStart: undefined, onStop: undefined, labels: undefined },
);
const emit = defineEmits<{ "update:running": [running: RunningTimer | null] }>();

const t = useTimeTrackerStrings(() => props.labels);
const inner = ref<RunningTimer | null>(props.defaultRunning);
const running = computed(() => (props.running !== undefined ? props.running : inner.value));
const projectId = ref<string | null>(running.value?.projectId ?? null);
const taskId = ref<string | null>(running.value?.taskId ?? null);
const note = ref(running.value?.note ?? "");
const busy = ref(false);
const message = ref<string | null>(null);
const needProject = ref(false);
const announce = ref("");
const now = ref(Date.now());
const noteId = `nq-time-note-${useId()}`;

const startedAt = computed(() => (running.value ? new Date(running.value.startedAt).getTime() : null));
let interval: ReturnType<typeof setInterval> | undefined;
watch(
  startedAt,
  (at) => {
    clearInterval(interval);
    if (at === null) return;
    now.value = Date.now();
    interval = setInterval(() => (now.value = Date.now()), 1000);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearInterval(interval));

// A controlled timer that changes from outside shows its own selection.
watch(running, (next, prev) => {
  if (next && next !== prev) {
    projectId.value = next.projectId;
    taskId.value = next.taskId ?? null;
    note.value = next.note ?? "";
  }
});

const elapsed = computed(() => (startedAt.value === null ? 0 : Math.max(0, Math.floor((now.value - startedAt.value) / 1000))));
const active = computed(() => (running.value ? lookupTime(props.projects, running.value.projectId, running.value.taskId) : null));

function change(next: RunningTimer | null) {
  inner.value = next;
  emit("update:running", next);
}

async function start() {
  if (!projectId.value) {
    needProject.value = true;
    return;
  }
  needProject.value = false;
  message.value = null;
  const at = Date.now();
  busy.value = true;
  try {
    const selection = { projectId: projectId.value, taskId: taskId.value ?? undefined, note: note.value.trim() || undefined };
    const result = await props.onStart?.({ ...selection, startedAt: at });
    if (result && result.error) {
      message.value = result.error;
      return;
    }
    now.value = at;
    change({ ...selection, startedAt: at });
    announce.value = t.value.running;
  } catch {
    message.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}

async function stop() {
  const run = running.value;
  const at = startedAt.value;
  if (!run || at === null) return;
  message.value = null;
  busy.value = true;
  try {
    const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000));
    const result = await props.onStop?.({ projectId: run.projectId, taskId: run.taskId, note: note.value.trim() || undefined, startedAt: at, seconds });
    if (result && result.error) {
      message.value = result.error;
      return;
    }
    change(null);
    note.value = "";
    announce.value = t.value.stopped;
  } catch {
    message.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}

function pick(next: { projectId: string | null; taskId: string | null }) {
  projectId.value = next.projectId;
  taskId.value = next.taskId;
  if (next.projectId) needProject.value = false;
}
</script>

<template>
  <NqCard data-slot="time-tracker" :class="cn(props.class)">
    <NqCardHeader>
      <NqCardTitle>{{ t.timer }}</NqCardTitle>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div role="timer" :aria-label="t.timer" aria-live="off" class="flex flex-col gap-0.5">
          <bdi dir="ltr" class="tabular-nums text-display-sm font-semibold text-foreground">{{ formatClock(elapsed) }}</bdi>
          <span class="text-body-sm text-muted-foreground">{{ active ? (active.task ? `${active.project} / ${active.task}` : active.project) : t.needProject }}</span>
        </div>
        <NqButton v-if="running" type="button" variant="danger" size="lg" :loading="busy" @click="stop()">
          <Square aria-hidden="true" />
          {{ t.stop }}
        </NqButton>
        <NqButton v-else type="button" variant="primary" size="lg" :loading="busy" @click="start()">
          <Play aria-hidden="true" />
          {{ t.start }}
        </NqButton>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <NqTimeTaskPicker
          :projects="props.projects"
          :project-id="projectId"
          :task-id="taskId"
          :disabled="Boolean(running) || busy"
          :invalid-project="needProject && !projectId"
          :t="t"
          @change="pick"
        />
        <NqField class="sm:col-span-2">
          <NqFieldLabel :for="noteId">{{ t.note }}</NqFieldLabel>
          <NqInput :id="noteId" v-model="note" />
        </NqField>
      </div>
      <p v-if="message" role="alert" class="text-body-sm text-nq-danger-text">{{ message }}</p>
      <span role="status" class="sr-only">{{ announce }}</span>
    </NqCardContent>
  </NqCard>
</template>
