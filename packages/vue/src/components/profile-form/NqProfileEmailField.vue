<script setup lang="ts">
import { CircleCheck, MailCheck, TriangleAlert } from "lucide-vue-next";
import { onBeforeUnmount, ref, watch } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDialog, NqDialogClose, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqPasswordInput } from "../password-input";
import { EMAIL_PATTERN } from "./profile-logic";
import type { ProfileFormLabels } from "./strings";
import type { ProfileFormFieldErrors, ProfileFormResult } from "./types";

// The email row of the profile form: read only, with the verified badge, a resend link with a cooldown, and the
// password-protected "Change email" dialog. Internal: it is used by NqProfileForm.
type Strings = Required<ProfileFormLabels>;
const props = defineProps<{
  email: string;
  verified?: boolean;
  pending: string | null;
  disabled?: boolean;
  t: Strings;
  onResend?: () => Promise<void>;
  onChange?: (input: { email: string; password: string }) => Promise<void | ProfileFormResult>;
}>();

const sending = ref<"idle" | "sending" | "sent" | "failed">("idle");
const open = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

// Sending again is possible after a short pause, so the link is not hammered.
watch(sending, (s) => {
  clearTimeout(timer);
  if (s === "sent") timer = setTimeout(() => (sending.value = "idle"), 30_000);
});
onBeforeUnmount(() => clearTimeout(timer));

async function resend() {
  if (!props.onResend || sending.value === "sending") return;
  sending.value = "sending";
  try {
    await props.onResend();
    sending.value = "sent";
  } catch {
    sending.value = "failed";
  }
}

const newEmail = ref("");
const password = ref("");
const errors = ref<ProfileFormFieldErrors>({});
const formError = ref<string | null>(null);
const busy = ref(false);

watch(open, (o) => {
  if (o) return;
  newEmail.value = "";
  password.value = "";
  errors.value = {};
  formError.value = null;
});

async function submit() {
  if (busy.value) return;
  const next: ProfileFormFieldErrors = {};
  const value = newEmail.value.trim();
  if (!EMAIL_PATTERN.test(value)) next.email = props.t.emailInvalid;
  else if (value.toLowerCase() === props.email.toLowerCase()) next.email = props.t.emailSame;
  if (!password.value) next.password = props.t.passwordRequired;
  errors.value = next;
  if (next.email || next.password) return;
  busy.value = true;
  formError.value = null;
  try {
    const result = await props.onChange?.({ email: value, password: password.value });
    if (result && (result.error || result.fieldErrors)) {
      errors.value = result.fieldErrors ?? {};
      formError.value = result.error ?? null;
    } else {
      emit("changed", value);
      open.value = false;
    }
  } catch {
    formError.value = props.t.changeEmailFailed;
  } finally {
    busy.value = false;
  }
}
const emit = defineEmits<{ changed: [email: string] }>();
</script>

<template>
  <NqField>
    <div class="flex flex-wrap items-center gap-2">
      <NqFieldLabel>{{ t.email }}</NqFieldLabel>
      <template v-if="verified !== undefined">
        <NqBadge v-if="verified" variant="success"><CircleCheck aria-hidden="true" />{{ t.verified }}</NqBadge>
        <NqBadge v-else variant="warning"><TriangleAlert aria-hidden="true" />{{ t.unverified }}</NqBadge>
      </template>
    </div>
    <NqInput ltr readonly name="email" type="email" autocomplete="email" :disabled="disabled" :model-value="email" />
    <NqFieldDescription>{{ t.emailHelp }}</NqFieldDescription>
    <div v-if="verified === false && onResend" class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <NqButton type="button" variant="link" :loading="sending === 'sending'" :disabled="disabled || sending === 'sent'" @click="resend">{{ sending === "sending" ? t.resending : t.resend }}</NqButton>
      <span aria-live="polite" :class="cn('text-caption', sending === 'failed' ? 'text-nq-danger-text' : 'text-nq-success-text')">{{ sending === "sent" ? t.resent(email) : sending === "failed" ? t.resendFailed : "" }}</span>
    </div>
    <NqAlert v-if="pending" tone="info" :icon="MailCheck">{{ t.pendingEmail(pending) }}</NqAlert>
    <div v-if="onChange">
      <NqButton type="button" variant="secondary" size="sm" :disabled="disabled" @click="open = true">{{ t.changeEmail }}</NqButton>
      <NqDialog :open="open" @update:open="(v: boolean) => !busy && (open = v)">
        <NqDialogContent>
          <form novalidate class="grid gap-4" @submit.prevent.stop="submit">
            <NqDialogHeader>
              <NqDialogTitle>{{ t.changeEmailTitle }}</NqDialogTitle>
              <NqDialogDescription>{{ t.changeEmailDescription }}</NqDialogDescription>
            </NqDialogHeader>
            <NqAlert v-if="formError" tone="danger">{{ formError }}</NqAlert>
            <NqField :invalid="!!errors.email">
              <NqFieldLabel>{{ t.newEmail }}</NqFieldLabel>
              <NqInput v-model="newEmail" ltr type="email" name="new-email" autocomplete="email" inputmode="email" autocapitalize="none" :spellcheck="false" @update:model-value="errors = { ...errors, email: undefined }" />
              <NqFieldError v-if="errors.email" match>{{ errors.email }}</NqFieldError>
            </NqField>
            <NqField :invalid="!!errors.password">
              <NqFieldLabel>{{ t.currentPassword }}</NqFieldLabel>
              <NqPasswordInput v-model="password" name="current-password" autocomplete="current-password" @update:model-value="errors = { ...errors, password: undefined }" />
              <NqFieldError v-if="errors.password" match>{{ errors.password }}</NqFieldError>
            </NqField>
            <NqDialogFooter>
              <NqDialogClose as-child><NqButton type="button" variant="ghost" :disabled="busy">{{ t.cancel }}</NqButton></NqDialogClose>
              <NqButton type="submit" variant="primary" :loading="busy">{{ t.sendConfirmation }}</NqButton>
            </NqDialogFooter>
          </form>
        </NqDialogContent>
      </NqDialog>
    </div>
  </NqField>
</template>
