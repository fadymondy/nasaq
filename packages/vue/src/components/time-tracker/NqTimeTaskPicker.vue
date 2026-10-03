<script setup lang="ts">
import { computed } from "vue";
import { NqField, NqFieldError, NqFieldLabel } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import type { TimeTrackerLabels } from "./strings";
import { TIME_TRACKER_STRINGS } from "./strings";
import type { TimeProject } from "./types";

// Project, then task: the task list follows the project. Used by NqTimeTracker and NqTimeEntryDialog.
const props = defineProps<{
  projects: readonly TimeProject[];
  projectId: string | null;
  taskId: string | null;
  disabled?: boolean;
  invalidProject?: boolean;
  t: (typeof TIME_TRACKER_STRINGS)["en"] & TimeTrackerLabels;
}>();
const emit = defineEmits<{ change: [next: { projectId: string | null; taskId: string | null }] }>();

const NO_TASK = "__none__";
const project = computed(() => props.projects.find((p) => p.id === props.projectId));
const tasks = computed(() => project.value?.tasks ?? []);
</script>

<template>
  <NqField :invalid="props.invalidProject" :disabled="props.disabled">
    <NqFieldLabel>{{ props.t.project }}</NqFieldLabel>
    <NqSelect :model-value="props.projectId" @update:model-value="(v) => emit('change', { projectId: (v as string | null) ?? null, taskId: null })">
      <NqSelectTrigger>
        <NqSelectValue :placeholder="props.t.pickProject" />
      </NqSelectTrigger>
      <NqSelectContent>
        <NqSelectItem v-for="p in props.projects" :key="p.id" :value="p.id">{{ p.name }}</NqSelectItem>
      </NqSelectContent>
    </NqSelect>
    <NqFieldError v-if="props.invalidProject" match>{{ props.t.needProjectField }}</NqFieldError>
  </NqField>
  <NqField :disabled="props.disabled || !project">
    <NqFieldLabel>{{ props.t.task }}</NqFieldLabel>
    <NqSelect
      :model-value="props.taskId ?? NO_TASK"
      @update:model-value="(v) => emit('change', { projectId: props.projectId, taskId: v && v !== NO_TASK ? (v as string) : null })"
    >
      <NqSelectTrigger>
        <NqSelectValue :placeholder="props.t.pickTask" />
      </NqSelectTrigger>
      <NqSelectContent>
        <NqSelectItem :value="NO_TASK">{{ props.t.noTask }}</NqSelectItem>
        <NqSelectItem v-for="x in tasks" :key="x.id" :value="x.id">{{ x.name }}</NqSelectItem>
      </NqSelectContent>
    </NqSelect>
  </NqField>
</template>
