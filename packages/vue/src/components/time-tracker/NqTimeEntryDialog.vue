<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { NqButton } from "../button";
import { NqDatePicker } from "../date-picker";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import NqTimeTaskPicker from "./NqTimeTaskPicker.vue";
import { dateKey, formatHours, fromDateKey, parseDuration } from "./time-math";
import { useTimeTrackerStrings, type TimeTrackerLabels } from "./strings";
import type { TimeEntry, TimeEntryInput, TimeProject, TimeResult } from "./types";

// Manual entry: date, project and task, a duration typed the way people say it, and a note.
const props = withDefaults(
  defineProps<{
    /** Whether the dialog is open (v-model:open). */
    open: boolean;
    projects: readonly TimeProject[];
    /** Entry being edited; omit to add a new one. */
    entry?: TimeEntry | null;
    defaultDate?: string;
    /** Resolves to `{ error }` to keep the dialog open. */
    onSubmit: (input: TimeEntryInput, entry?: TimeEntry | null) => Promise<TimeResult> | TimeResult;
    labels?: TimeTrackerLabels;
  }>(),
  { entry: null, defaultDate: undefined, labels: undefined },
);
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const t = useTimeTrackerStrings(() => props.labels);
const date = ref<Date>(fromDateKey(props.entry?.date ?? props.defaultDate ?? dateKey(new Date())));
const projectId = ref<string | null>(props.entry?.projectId ?? null);
const taskId = ref<string | null>(props.entry?.taskId ?? null);
const duration = ref(props.entry ? formatHours(props.entry.seconds) : "");
const note = ref(props.entry?.note ?? "");
const tried = ref(false);
const busy = ref(false);
const message = ref<string | null>(null);
const uid = useId();
const durationId = `nq-time-duration-${uid}`;
const noteId = `nq-time-note-${uid}`;

// Each time the dialog opens it starts from the entry (or blank), not from the last edit.
watch(
  () => [props.open, props.entry, props.defaultDate] as const,
  ([open]) => {
    if (!open) return;
    date.value = fromDateKey(props.entry?.date ?? props.defaultDate ?? dateKey(new Date()));
    projectId.value = props.entry?.projectId ?? null;
    taskId.value = props.entry?.taskId ?? null;
    duration.value = props.entry ? formatHours(props.entry.seconds) : "";
    note.value = props.entry?.note ?? "";
    tried.value = false;
    message.value = null;
  },
);

const seconds = computed(() => parseDuration(duration.value));
const durationProblem = computed(() =>
  !duration.value.trim() || seconds.value === null || seconds.value <= 0 ? t.value.invalidDuration : seconds.value > 86400 ? t.value.tooLong : null,
);
const projectProblem = computed(() => !projectId.value);

async function submit() {
  tried.value = true;
  if (durationProblem.value || projectProblem.value || seconds.value === null || !projectId.value) return;
  busy.value = true;
  message.value = null;
  try {
    const result = await props.onSubmit(
      { date: dateKey(date.value), seconds: seconds.value, projectId: projectId.value, taskId: taskId.value ?? undefined, note: note.value.trim() || undefined },
      props.entry,
    );
    if (result && result.error) {
      message.value = result.error;
      return;
    }
    emit("update:open", false);
  } catch {
    message.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(next) => !busy && emit('update:open', next)">
    <NqDialogContent>
      <form novalidate class="grid gap-4" @submit.prevent="submit()">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.entry ? t.editTitle : t.entryTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.entryDescription }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField>
          <NqFieldLabel>{{ t.date }}</NqFieldLabel>
          <NqDatePicker :aria-label="t.date" :model-value="date" @update:model-value="(d) => d && (date = d)" />
        </NqField>
        <NqTimeTaskPicker
          :projects="props.projects"
          :project-id="projectId"
          :task-id="taskId"
          :invalid-project="tried && projectProblem"
          :t="t"
          @change="(next) => ((projectId = next.projectId), (taskId = next.taskId))"
        />
        <NqField :invalid="tried && Boolean(durationProblem)">
          <NqFieldLabel :for="durationId">{{ t.duration }}</NqFieldLabel>
          <NqInput :id="durationId" inputmode="text" dir="ltr" autocomplete="off" v-model="duration" />
          <NqFieldDescription>{{ t.durationHint }}</NqFieldDescription>
          <NqFieldError v-if="tried && durationProblem" match>{{ durationProblem }}</NqFieldError>
        </NqField>
        <NqField>
          <NqFieldLabel :for="noteId">{{ t.note }}</NqFieldLabel>
          <NqInput :id="noteId" v-model="note" />
        </NqField>
        <p v-if="message" role="alert" class="text-body-sm text-nq-danger-text">{{ message }}</p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('update:open', false)">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy">{{ t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
