<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { checkName, type NameProblem } from "./file-format";
import type { FileExplorerLabels } from "./strings";
import type { FileResult } from "./types";

// The "New folder" dialog of NqFileExplorer. Mount it to open it, it emits `close` when done.
const props = defineProps<{ siblings: readonly string[]; onCreate: (name: string) => Promise<FileResult>; t: FileExplorerLabels }>();
const emit = defineEmits<{ close: [] }>();

const PROBLEM: Record<NameProblem, "folderEmpty" | "folderInvalid" | "folderDuplicate" | "folderReserved"> = {
  empty: "folderEmpty",
  invalid: "folderInvalid",
  duplicate: "folderDuplicate",
  reserved: "folderReserved",
};
const name = ref("");
const touched = ref(false);
const error = ref<string | null>(null);
const pending = ref(false);
const id = useId();
const problem = computed(() => checkName(name.value, props.siblings));
const show = computed(() => problem.value !== null && (touched.value || problem.value === "duplicate" || problem.value === "invalid"));

async function submit() {
  touched.value = true;
  if (problem.value || pending.value) return;
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onCreate(name.value.trim());
    if (result?.error) error.value = result.error;
    else emit("close");
  } catch {
    error.value = props.t.genericError;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NqDialog :open="true" @update:open="(o: boolean) => !o && !pending && emit('close')">
    <NqDialogContent>
      <form class="grid gap-4" novalidate @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.folderTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.folderBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="show">
          <NqFieldLabel>{{ props.t.folderName }}</NqFieldLabel>
          <NqInput v-model="name" autocomplete="off" :aria-describedby="show ? `${id}-name` : undefined" @blur="touched = true" />
          <p v-if="show && problem" :id="`${id}-name`" role="alert" class="text-caption text-nq-danger-text">{{ props.t[PROBLEM[problem]] }}</p>
        </NqField>
        <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ props.t.create }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
