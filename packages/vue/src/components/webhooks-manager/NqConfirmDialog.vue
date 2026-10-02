<script setup lang="ts">
import { ref, watch } from "vue";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import type { WebhooksConfirm } from "./strings";

// The delete and rotate confirmation. Internal.
const props = defineProps<{ request: WebhooksConfirm | null; cancel: string }>();
const emit = defineEmits<{ close: [] }>();

const held = ref<WebhooksConfirm | null>(props.request);
const pending = ref(false);
watch(
  () => props.request,
  (r) => {
    if (r) held.value = r;
  },
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
  <NqAlertDialog :open="props.request !== null" @update:open="(o: boolean) => !o && !pending && emit('close')">
    <NqAlertDialogContent data-slot="webhooks-confirm">
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
