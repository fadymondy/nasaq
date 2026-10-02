<script setup lang="ts">
import { computed, ref } from "vue";
import { NqAlert } from "../alert";
import {
  NqAlertDialog,
  NqAlertDialogCancel,
  NqAlertDialogContent,
  NqAlertDialogDescription,
  NqAlertDialogFooter,
  NqAlertDialogHeader,
  NqAlertDialogTitle,
} from "../alert-dialog";
import { NqButton } from "../button";
import type { FileExplorerLabels } from "./strings";
import type { FileNode, FileResult } from "./types";

// The delete confirm of NqFileExplorer. Mount it to open it, it emits `close` when done.
const props = defineProps<{ node: FileNode; onConfirm: () => Promise<FileResult>; t: FileExplorerLabels }>();
const emit = defineEmits<{ close: [] }>();

function countItems(node: FileNode): number {
  return (node.children ?? []).reduce((sum, c) => sum + 1 + (c.kind === "folder" ? countItems(c) : 0), 0);
}
const pending = ref(false);
const error = ref<string | null>(null);
const body = computed(() => (props.node.kind === "folder" ? props.t.deleteBodyFolder(countItems(props.node)) : props.t.deleteBodyFile));

async function confirm() {
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onConfirm();
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
  <NqAlertDialog :open="true" @update:open="(o: boolean) => !o && !pending && emit('close')">
    <NqAlertDialogContent>
      <NqAlertDialogHeader>
        <NqAlertDialogTitle><bdi dir="auto">{{ props.t.deleteTitle(props.node.name) }}</bdi></NqAlertDialogTitle>
        <NqAlertDialogDescription>{{ body }}</NqAlertDialogDescription>
      </NqAlertDialogHeader>
      <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
      <NqAlertDialogFooter>
        <NqAlertDialogCancel :disabled="pending">{{ props.t.cancel }}</NqAlertDialogCancel>
        <NqButton type="button" variant="danger" :loading="pending" @click="confirm">{{ props.t.deleteConfirm }}</NqButton>
      </NqAlertDialogFooter>
    </NqAlertDialogContent>
  </NqAlertDialog>
</template>
