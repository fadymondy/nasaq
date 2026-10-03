<script setup lang="ts">
import { ref, watch } from "vue";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import type { ConfirmRequest } from "./types";

// One confirm dialog opened from a menu item or a button. Internal to the server admin panels.
const props = defineProps<{ request: ConfirmRequest | null; cancel: string }>();
const emit = defineEmits<{ close: [] }>();
const held = ref<ConfirmRequest | null>(props.request);
const pending = ref(false);
watch(
  () => props.request,
  (r) => r && (held.value = r),
);

async function confirm() {
  pending.value = true;
  try {
    await held.value?.run();
  } finally {
    pending.value = false;
    emit("close");
  }
}
</script>

<template>
  <NqAlertDialog :open="props.request !== null" @update:open="(open: boolean) => !open && !pending && emit('close')">
    <NqAlertDialogContent data-slot="server-admin-confirm">
      <NqAlertDialogHeader>
        <NqAlertDialogTitle>{{ held?.title }}</NqAlertDialogTitle>
        <NqAlertDialogDescription>{{ held?.body }}</NqAlertDialogDescription>
      </NqAlertDialogHeader>
      <NqAlertDialogFooter>
        <NqAlertDialogCancel :disabled="pending">{{ props.cancel }}</NqAlertDialogCancel>
        <NqButton :variant="held?.danger === false ? 'primary' : 'danger'" :loading="pending" @click="confirm">{{ held?.confirm }}</NqButton>
      </NqAlertDialogFooter>
    </NqAlertDialogContent>
  </NqAlertDialog>
</template>
