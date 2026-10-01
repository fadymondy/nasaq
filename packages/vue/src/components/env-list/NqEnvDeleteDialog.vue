<script setup lang="ts">
import { ref } from "vue";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import type { EnvListStrings } from "./strings";
import type { EnvResult } from "./types";

// Confirms a delete in an alert dialog that names the key. Mounted only while open.
interface Props {
  name: string;
  t: EnvListStrings;
  onConfirm: () => Promise<EnvResult>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const pending = ref(false);
const error = ref<string | null>(null);

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
  <NqAlertDialog open @update:open="(open) => !open && !pending && emit('close')">
    <NqAlertDialogContent>
      <NqAlertDialogHeader>
        <NqAlertDialogTitle><bdi dir="ltr" class="font-mono">{{ props.t.deleteTitle(props.name) }}</bdi></NqAlertDialogTitle>
        <NqAlertDialogDescription>{{ props.t.deleteBody }}</NqAlertDialogDescription>
      </NqAlertDialogHeader>
      <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
      <NqAlertDialogFooter>
        <NqAlertDialogCancel :disabled="pending">{{ props.t.cancel }}</NqAlertDialogCancel>
        <NqButton type="button" variant="danger" :loading="pending" @click="confirm()">{{ props.t.deleteConfirm }}</NqButton>
      </NqAlertDialogFooter>
    </NqAlertDialogContent>
  </NqAlertDialog>
</template>
