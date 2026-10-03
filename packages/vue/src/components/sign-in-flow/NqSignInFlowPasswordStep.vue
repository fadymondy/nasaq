<script setup lang="ts">
import { Link2, Mail, TriangleAlert } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { NqAuthErrorSummary, useAuthForm, type AuthSubmitResult } from "../auth-layout";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldError, NqFieldLabel } from "../field";
import { NqPasswordInput } from "../password-input";
import type { SignInFlowLabels, SignInPasswordResult } from "./strings";

// The password step. Internal to SignInFlow. Slot: forgotPassword (beside the label).
const props = defineProps<{
  t: SignInFlowLabels;
  email: string;
  onPassword?: (values: { email: string; password: string; remember: boolean }) => Promise<SignInPasswordResult> | SignInPasswordResult;
  showRemember: boolean;
  onMagicLink?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  onUseCode?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
}>();
const emit = defineEmits<{ twoFactor: [challenge: { length?: number }] }>();

const password = ref("");
const remember = ref(false);
const codePending = ref(false);
const linkPending = ref(false);
const caps = ref(false);
const readCaps = (e: KeyboardEvent) => {
  caps.value = e.getModifierState("CapsLock");
};
const form = useAuthForm<{ password: string }, "password">({
  fallbackError: props.t.failed,
  validate: (v) => ({ password: v.password ? undefined : props.t.passwordRequired }),
  onSubmit: async (v) => {
    const result = await props.onPassword?.({ email: props.email, password: v.password, remember: remember.value });
    if (result && "twoFactor" in result) {
      emit("twoFactor", result);
      return;
    }
    return result;
  },
});
const { formRef, pending, fieldErrors: fe } = form;
const summaryEl = (c: unknown) => {
  form.summaryRef.value = (c as { el?: HTMLElement | null } | null)?.el ?? null;
};
async function alternative(run: () => Promise<AuthSubmitResult> | AuthSubmitResult, setPending: (v: boolean) => void) {
  setPending(true);
  try {
    const failure = await run();
    if (failure) form.error.value = failure.error ?? props.t.failed;
  } catch {
    form.error.value = props.t.failed;
  } finally {
    setPending(false);
  }
}
const altPending = computed(() => codePending.value || linkPending.value);
onMounted(() => formRef.value?.querySelector<HTMLInputElement>('input[name="password"]')?.focus());
</script>

<template>
  <form ref="formRef" novalidate data-slot="sign-in-flow-password" :aria-busy="pending || undefined" class="flex flex-col gap-4" @submit.prevent="form.submit({ password })">
    <!-- Password managers pair the saved password with this username. -->
    <input type="email" name="username" autocomplete="username" :value="email" readonly hidden />
    <NqAuthErrorSummary :ref="summaryEl" :error="form.error.value" :field-errors="fe" :field-labels="{ password: t.password }" :title="t.errorTitle" @focus-field="form.focusField" />
    <NqField name="password" :invalid="Boolean(fe.password)">
      <div class="flex items-baseline justify-between gap-3">
        <NqFieldLabel>{{ t.password }}</NqFieldLabel>
        <span v-if="$slots.forgotPassword" class="text-caption"><slot name="forgotPassword" /></span>
      </div>
      <NqPasswordInput
        v-model="password"
        name="password"
        autocomplete="current-password"
        :aria-invalid="fe.password ? true : undefined"
        @keydown="readCaps"
        @keyup="readCaps"
        @blur="caps = false"
        @update:model-value="form.clear('password')"
      />
      <NqFieldError v-if="fe.password" match>{{ fe.password }}</NqFieldError>
      <!-- Always in the DOM, so screen readers hear the warning when it appears. -->
      <p data-slot="sign-in-flow-caps" role="status" class="empty:hidden flex items-center gap-1.5 text-caption text-nq-warning-text">
        <template v-if="caps">
          <TriangleAlert aria-hidden="true" class="size-3.5 shrink-0" />
          {{ t.capsLock }}
        </template>
      </p>
    </NqField>
    <label v-if="showRemember" class="flex items-center gap-2 text-body-sm text-foreground">
      <NqCheckbox v-model="remember" name="remember" />
      {{ t.remember }}
    </label>
    <NqButton type="submit" variant="primary" size="lg" :loading="pending" :disabled="altPending">{{ t.signIn }}</NqButton>
    <NqButton
      v-if="onMagicLink"
      type="button"
      variant="ghost"
      size="lg"
      :loading="linkPending"
      :disabled="pending || codePending"
      data-slot="sign-in-flow-magic-link"
      @click="alternative(onMagicLink, (v) => (linkPending = v))"
    >
      <Link2 aria-hidden="true" />
      {{ t.magicLink }}
    </NqButton>
    <NqButton v-if="onUseCode" type="button" variant="ghost" size="lg" :loading="codePending" :disabled="pending || linkPending" @click="alternative(onUseCode, (v) => (codePending = v))">
      <Mail aria-hidden="true" />
      {{ t.useCode }}
    </NqButton>
  </form>
</template>
