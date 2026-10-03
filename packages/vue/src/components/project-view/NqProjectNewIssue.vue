<script setup lang="ts">
import { ref } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { ISSUE_PRIORITIES, ISSUE_TYPES, type IssuePriority, type IssueType } from "../issue-view/issue-logic";
import NqPriorityIcon from "../issue-view/NqPriorityIcon.vue";
import NqTypeIcon from "../issue-view/NqTypeIcon.vue";
import { useIssueStrings } from "../issue-view/strings";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import type { ProjectViewStrings } from "./strings";
import type { NewIssueInput, ProjectResult } from "./types";

// The New issue dialog: a title, a type and a priority.
const props = defineProps<{
  open: boolean;
  onCreate: (input: NewIssueInput) => Promise<ProjectResult>;
  t: ProjectViewStrings;
}>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const { t: it } = useIssueStrings(() => undefined);
const title = ref("");
const type = ref<IssueType>("task");
const priority = ref<IssuePriority>("medium");
const busy = ref(false);
const error = ref<string | null>(null);

async function submit() {
  if (!title.value.trim()) {
    error.value = props.t.title;
    return;
  }
  busy.value = true;
  const result = await props.onCreate({ title: title.value.trim(), type: type.value, priority: priority.value });
  busy.value = false;
  if (result && "error" in result && result.error) {
    error.value = result.error;
    return;
  }
  title.value = "";
  error.value = null;
  emit("update:open", false);
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(o: boolean) => emit('update:open', o)">
    <NqDialogContent>
      <form class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.newIssue }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.newIssueHint }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="Boolean(error)">
          <NqFieldLabel>{{ props.t.title }}</NqFieldLabel>
          <NqInput v-model="title" autofocus />
        </NqField>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <span class="text-label">{{ props.t.type }}</span>
            <NqSelect v-model="type">
              <NqSelectTrigger :aria-label="props.t.type"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="x in ISSUE_TYPES" :key="x" :value="x"><span class="flex items-center gap-2"><NqTypeIcon :type="x" />{{ it.types[x] }}</span></NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="text-label">{{ props.t.priority }}</span>
            <NqSelect v-model="priority">
              <NqSelectTrigger :aria-label="props.t.priority"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="x in ISSUE_PRIORITIES" :key="x" :value="x"><span class="flex items-center gap-2"><NqPriorityIcon :priority="x" />{{ it.priorities[x] }}</span></NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </div>
        </div>
        <p v-if="error" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ error }}</p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" :loading="busy">{{ props.t.create }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
