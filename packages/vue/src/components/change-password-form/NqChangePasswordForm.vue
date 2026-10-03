<script setup lang="ts">
import { computed, reactive, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel } from "../field";
import { NqPasswordInput } from "../password-input";
import { STRINGS, type ChangePasswordField, type ChangePasswordLabels, type ChangePasswordResult, type ChangePasswordValues } from "./strings";

// Change the password of the signed-in account: current, new (with the strength meter) and confirm, plus an option to
// sign out other sessions. Validates on the client, then hands the values to your async `onSubmit`.
interface Props {
  /** Runs when the form is valid. Resolve for success, or `{ error, fieldErrors }` to show messages. */
  onSubmit: (values: ChangePasswordValues) => Promise<ChangePasswordResult>;
  minLength?: number;
  showSignOutOthers?: boolean;
  defaultSignOutOthers?: boolean;
  labels?: Partial<ChangePasswordLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { minLength: 8, showSignOutOthers: true, defaultSignOutOthers: true, labels: undefined });

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const checkId = `nq-cpw-${useId()}`;
const current = ref("");
const next = ref("");
const confirm = ref("");
const signOutOthers = ref(props.defaultSignOutOthers);
const errors = reactive<Partial<Record<ChangePasswordField, string>>>({});
const formError = ref<string | null>(null);
const done = ref(false);
const pending = ref(false);

function setErrors(e: Partial<Record<ChangePasswordField, string>>) {
  for (const k of ["currentPassword", "newPassword", "confirmPassword"] as const) {
    if (e[k]) errors[k] = e[k];
    else delete errors[k];
  }
}

async function submit() {
  if (pending.value) return;
  const found: Partial<Record<ChangePasswordField, string>> = {};
  if (!current.value) found.currentPassword = t.value.required;
  if (!next.value) found.newPassword = t.value.required;
  else if ([...next.value].length < props.minLength) found.newPassword = t.value.tooShort(props.minLength);
  else if (next.value === current.value) found.newPassword = t.value.same;
  if (!confirm.value) found.confirmPassword = t.value.required;
  else if (confirm.value !== next.value) found.confirmPassword = t.value.mismatch;
  setErrors(found);
  formError.value = null;
  done.value = false;
  if (Object.keys(found).length) return;

  pending.value = true;
  try {
    const result = await props.onSubmit({
      currentPassword: current.value,
      newPassword: next.value,
      signOutOthers: props.showSignOutOthers && signOutOthers.value,
    });
    if (result && (result.error || result.fieldErrors)) {
      setErrors(result.fieldErrors ?? {});
      formError.value = result.error ?? null;
      return;
    }
    current.value = "";
    next.value = "";
    confirm.value = "";
    done.value = true;
  } catch {
    formError.value = t.value.genericError;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <form data-slot="change-password-form" novalidate :class="cn('flex w-full max-w-md flex-col gap-4', props.class)" @submit.prevent="submit">
    <NqAlert v-if="done" tone="success">{{ t.success }}</NqAlert>
    <NqAlert v-if="formError" tone="danger">{{ formError }}</NqAlert>
    <NqField :invalid="!!errors.currentPassword">
      <NqFieldLabel>{{ t.current }}</NqFieldLabel>
      <NqPasswordInput v-model="current" name="currentPassword" autocomplete="current-password" required :disabled="pending" />
      <NqFieldError v-if="errors.currentPassword" match>{{ errors.currentPassword }}</NqFieldError>
    </NqField>
    <NqField :invalid="!!errors.newPassword">
      <NqFieldLabel>{{ t.next }}</NqFieldLabel>
      <NqPasswordInput v-model="next" name="newPassword" autocomplete="new-password" :minlength="props.minLength" required show-strength :disabled="pending" />
      <NqFieldError v-if="errors.newPassword" match>{{ errors.newPassword }}</NqFieldError>
      <NqFieldDescription v-else>{{ t.nextHint }}</NqFieldDescription>
    </NqField>
    <NqField :invalid="!!errors.confirmPassword">
      <NqFieldLabel>{{ t.confirm }}</NqFieldLabel>
      <NqPasswordInput v-model="confirm" name="confirmPassword" autocomplete="new-password" required :disabled="pending" />
      <NqFieldError v-if="errors.confirmPassword" match>{{ errors.confirmPassword }}</NqFieldError>
    </NqField>
    <div v-if="props.showSignOutOthers" class="flex items-start gap-2">
      <NqCheckbox :id="checkId" v-model="signOutOthers" class="mt-0.5" :disabled="pending" />
      <div class="flex flex-col gap-0.5">
        <label :for="checkId" class="text-body-sm text-foreground">{{ t.signOutOthers }}</label>
        <p class="text-caption text-muted-foreground">{{ t.signOutOthersHint }}</p>
      </div>
    </div>
    <div>
      <NqButton type="submit" variant="primary" :loading="pending">{{ t.submit }}</NqButton>
    </div>
  </form>
</template>
