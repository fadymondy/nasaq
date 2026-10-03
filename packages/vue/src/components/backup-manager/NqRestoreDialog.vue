<script setup lang="ts">
import { ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import type { BackupManagerLabels } from "./strings";
import type { BackupRecord } from "./types";

// The confirm step of a restore: an acknowledgement checkbox gates the danger button.
interface Props {
  backup: BackupRecord | null;
  name: string;
  safety: boolean;
  t: BackupManagerLabels;
  onConfirm: (id: string) => Promise<void>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const checked = ref(false);
const pending = ref(false);
watch(
  () => props.backup,
  (b) => b && (checked.value = false),
);

function onOpen(open: boolean) {
  if (!open && !pending.value) emit("close");
}

async function confirm() {
  if (!props.backup) return;
  pending.value = true;
  try {
    await props.onConfirm(props.backup.id);
  } finally {
    pending.value = false;
    emit("close");
  }
}
</script>

<template>
  <NqDialog :open="props.backup !== null" @update:open="onOpen">
    <NqDialogContent data-slot="backup-restore">
      <NqDialogHeader>
        <NqDialogTitle>{{ props.t.restoreTitle(props.name) }}</NqDialogTitle>
        <NqDialogDescription>{{ props.t.restoreBody }}</NqDialogDescription>
      </NqDialogHeader>
      <NqAlert tone="warning">{{ props.safety ? props.t.restoreSafety : props.t.restoreBody }}</NqAlert>
      <label class="flex cursor-pointer items-start gap-2.5 text-body-sm text-foreground">
        <NqCheckbox v-model="checked" class="mt-0.5" />
        <span>{{ props.t.restoreCheck }}</span>
      </label>
      <NqDialogFooter>
        <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('close')">{{ props.t.cancel }}</NqButton>
        <NqButton type="button" variant="danger" :disabled="!checked" :loading="pending" @click="confirm">{{ props.t.restoreConfirm }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
