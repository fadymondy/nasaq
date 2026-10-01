<script setup lang="ts">
import { ref } from "vue";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import { baseName } from "./location-path";
import type { DesktopLocationsLabels } from "./strings";
import type { DesktopLocation, LocationResult } from "./types";

// The remove confirmation. Internal to NqDesktopLocations; mounted only while open.
interface Props {
  location: DesktopLocation;
  onConfirm: () => Promise<LocationResult> | LocationResult;
  t: DesktopLocationsLabels;
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
  <NqAlertDialog :open="true" @update:open="(open: boolean) => !open && !pending && emit('close')">
    <NqAlertDialogContent>
      <NqAlertDialogHeader>
        <NqAlertDialogTitle>{{ props.t.removeTitle(props.location.label?.trim() || baseName(props.location.path)) }}</NqAlertDialogTitle>
        <NqAlertDialogDescription>{{ props.t.removeBody }}</NqAlertDialogDescription>
      </NqAlertDialogHeader>
      <bdi dir="ltr" class="block break-all rounded-control border border-border bg-secondary p-2 font-mono text-code">{{ props.location.path }}</bdi>
      <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
      <NqAlertDialogFooter>
        <NqAlertDialogCancel :disabled="pending">{{ props.t.cancel }}</NqAlertDialogCancel>
        <NqButton variant="danger" :loading="pending" @click="confirm">{{ props.t.removeConfirm }}</NqButton>
      </NqAlertDialogFooter>
    </NqAlertDialogContent>
  </NqAlertDialog>
</template>
