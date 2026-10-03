<script setup lang="ts">
import { Archive, Trash2 } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqCard, NqCardContent } from "../card";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import type { ProjectViewStrings } from "./strings";
import type { ProjectResult } from "./types";

// Archive and delete, each behind a confirm. Delete asks for the project key.
const props = defineProps<{
  /** Typed to confirm a delete. */
  projectKey: string;
  archived: boolean;
  onArchive?: () => Promise<ProjectResult>;
  onDelete?: () => Promise<ProjectResult>;
  t: ProjectViewStrings;
}>();

const confirm = ref<"archive" | "delete" | null>(null);
const typed = ref("");
const busy = ref(false);
const error = ref<string | null>(null);
const needsKey = computed(() => confirm.value === "delete");
const ready = computed(() => !needsKey.value || typed.value.trim().toLowerCase() === props.projectKey.toLowerCase());

function close() {
  confirm.value = null;
  typed.value = "";
  error.value = null;
}
async function run() {
  const action = confirm.value === "archive" ? props.onArchive : props.onDelete;
  if (!action) return;
  busy.value = true;
  const result = await action();
  busy.value = false;
  if (result && "error" in result && result.error) {
    error.value = result.error;
    return;
  }
  close();
}
</script>

<template>
  <div data-slot="project-danger" class="flex min-w-0 flex-col gap-3">
    <NqCard v-if="props.onArchive && !props.archived">
      <NqCardContent class="flex min-w-0 flex-wrap items-center justify-between gap-3 pt-4">
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="text-label">{{ props.t.archiveTitle }}</span>
          <span class="text-body-sm text-muted-foreground">{{ props.t.archiveBody }}</span>
        </div>
        <NqButton variant="secondary" @click="confirm = 'archive'"><Archive aria-hidden="true" />{{ props.t.archiveAction }}</NqButton>
      </NqCardContent>
    </NqCard>
    <NqCard v-if="props.onDelete" class="border-nq-danger/40">
      <NqCardContent class="flex min-w-0 flex-wrap items-center justify-between gap-3 pt-4">
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="text-label">{{ props.t.deleteTitle }}</span>
          <span class="text-body-sm text-muted-foreground">{{ props.t.deleteBody }}</span>
        </div>
        <NqButton variant="danger" @click="confirm = 'delete'"><Trash2 aria-hidden="true" />{{ props.t.deleteAction }}</NqButton>
      </NqCardContent>
    </NqCard>

    <NqDialog :open="confirm !== null" @update:open="(o: boolean) => !o && close()">
      <NqDialogContent>
        <form class="flex flex-col gap-4" @submit.prevent="ready && run()">
          <NqDialogHeader>
            <NqDialogTitle>{{ confirm === "delete" ? props.t.deleteConfirmTitle : props.t.archiveConfirmTitle }}</NqDialogTitle>
            <NqDialogDescription>{{ confirm === "delete" ? props.t.deleteConfirmBody : props.t.archiveConfirmBody }}</NqDialogDescription>
          </NqDialogHeader>
          <NqField v-if="needsKey">
            <NqFieldLabel>{{ props.t.deleteConfirmField }}</NqFieldLabel>
            <NqInput v-model="typed" ltr autofocus autocomplete="off" :placeholder="props.projectKey" />
          </NqField>
          <p v-if="error" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ error }}</p>
          <NqDialogFooter>
            <NqButton type="button" variant="ghost" :disabled="busy" @click="close">{{ props.t.cancel }}</NqButton>
            <NqButton type="submit" :variant="needsKey ? 'danger' : 'primary'" :loading="busy" :disabled="!ready">{{ needsKey ? props.t.deleteAction : props.t.archiveAction }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>
  </div>
</template>
