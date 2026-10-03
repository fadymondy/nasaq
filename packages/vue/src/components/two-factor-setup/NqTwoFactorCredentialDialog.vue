<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import { NqField, NqFieldDescription, NqFieldLabel } from "../field";
import { NqOtpInput } from "../otp-input";
import { NqPasswordInput } from "../password-input";
import type { TwoFactorLabels, TwoFactorResult } from "./labels";

// An alert dialog that asks for a password or a code, runs an async action, and stays open on error. Internal to NqTwoFactorSetup.
interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  mode: "password" | "code";
  t: TwoFactorLabels;
  onSubmit: (credential: string) => Promise<TwoFactorResult>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();

const value = ref("");
const error = ref<string | null>(null);
const pending = ref(false);
watch(
  () => props.open,
  (open) => {
    if (open) {
      value.value = "";
      error.value = null;
    }
  },
);
const ready = computed(() => (props.mode === "code" ? value.value.length === 6 : value.value.length > 0));

async function submit() {
  if (!ready.value || pending.value) return;
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onSubmit(value.value);
    if (result && result.error) error.value = result.error;
    else emit("update:open", false);
  } catch {
    error.value = props.t.genericError;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NqAlertDialog :open="props.open" @update:open="emit('update:open', $event)">
    <NqAlertDialogContent>
      <form class="grid gap-4" @submit.prevent="submit">
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ props.title }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ props.description }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqField :invalid="error !== null">
          <NqFieldLabel>{{ props.mode === "code" ? props.t.authCode : props.t.password }}</NqFieldLabel>
          <NqOtpInput v-if="props.mode === 'code'" v-model="value" :invalid="error !== null" :get-box-label="props.t.boxLabel" />
          <NqPasswordInput v-else v-model="value" autocomplete="current-password" />
          <NqFieldDescription>{{ props.mode === "code" ? props.t.confirmCode : props.t.confirmPassword }}</NqFieldDescription>
          <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
        </NqField>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel :disabled="pending">{{ props.t.cancel }}</NqAlertDialogCancel>
          <NqButton type="submit" :variant="props.danger ? 'danger' : 'primary'" :loading="pending" :disabled="!ready">{{ props.confirmLabel }}</NqButton>
        </NqAlertDialogFooter>
      </form>
    </NqAlertDialogContent>
  </NqAlertDialog>
</template>
