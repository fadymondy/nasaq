<script setup lang="ts">
import { ref } from "vue";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import type { VaultLabels } from "./strings";
import type { VaultResult, VaultSecret } from "./types";

// The delete confirmation of NqVault.
const props = defineProps<{
  secret: VaultSecret;
  onConfirm: () => Promise<VaultResult>;
  t: VaultLabels;
}>();
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
  <NqAlertDialog :open="true" @update:open="(open: boolean) => !open && !pending && emit('close')">
    <NqAlertDialogContent data-slot="vault-delete-dialog">
      <NqAlertDialogHeader>
        <NqAlertDialogTitle>
          <bdi dir="ltr" class="font-mono">{{ props.t.deleteTitle(props.secret.name) }}</bdi>
        </NqAlertDialogTitle>
        <NqAlertDialogDescription>{{ props.t.deleteBody }}</NqAlertDialogDescription>
      </NqAlertDialogHeader>
      <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
      <NqAlertDialogFooter>
        <NqAlertDialogCancel :disabled="pending">{{ props.t.cancel }}</NqAlertDialogCancel>
        <NqButton type="button" variant="danger" :loading="pending" @click="confirm">{{ props.t.deleteConfirm }}</NqButton>
      </NqAlertDialogFooter>
    </NqAlertDialogContent>
  </NqAlertDialog>
</template>
