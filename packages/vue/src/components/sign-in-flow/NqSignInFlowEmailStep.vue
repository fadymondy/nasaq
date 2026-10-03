<script setup lang="ts">
import { KeyRound } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { isEmail, NqAuthErrorSummary, useAuthForm, useConditionalPasskey, usePasskeySupport, type AuthSubmitResult } from "../auth-layout";
import { NqButton } from "../button";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqLastUsed, NqOAuthButtons, NqOAuthDivider, type OAuthProvider } from "../oauth-buttons";
import type { SignInFlowLabels, SignInNext } from "./strings";

// The first step: the email, the providers and a passkey. Internal to SignInFlow.
const props = defineProps<{
  t: SignInFlowLabels;
  onIdentify?: (email: string) => Promise<SignInNext | AuthSubmitResult> | SignInNext | AuthSubmitResult;
  /** The step for an address when `onIdentify` is missing or resolves with nothing. */
  fallback: (email: string) => Promise<SignInNext | AuthSubmitResult> | SignInNext | AuthSubmitResult;
  oauthProviders?: OAuthProvider[];
  onOAuth?: (id: string) => void | Promise<unknown>;
  onPasskey?: () => void | Promise<unknown>;
  onPasskeyAutofill?: (signal: AbortSignal) => void | Promise<unknown>;
  lastUsed?: string | null;
}>();
const email = defineModel<string>("email", { default: "" });
const emit = defineEmits<{ next: [next: SignInNext, email: string] }>();

const passkeySupported = usePasskeySupport();
const withPasskey = computed(() => Boolean(props.onPasskey) && passkeySupported.value);
useConditionalPasskey(props.onPasskey && props.onPasskeyAutofill ? (signal) => props.onPasskeyAutofill?.(signal) : undefined);
const passkeyPending = ref(false);

const form = useAuthForm<{ email: string }, "email">({
  fallbackError: props.t.failed,
  validate: (v) => ({ email: v.email ? (isEmail(v.email) ? undefined : props.t.emailInvalid) : props.t.emailRequired }),
  onSubmit: async (v) => {
    const result = (await props.onIdentify?.(v.email)) || (await props.fallback(v.email));
    if (result && "step" in result) {
      emit("next", result, v.email);
      return;
    }
    return result as AuthSubmitResult;
  },
});
const { formRef, pending, fieldErrors: fe } = form;
const summaryEl = (c: unknown) => {
  form.summaryRef.value = (c as { el?: HTMLElement | null } | null)?.el ?? null;
};
const busy = computed(() => pending.value || passkeyPending.value);
const hasAlternatives = computed(() => withPasskey.value || Boolean(props.oauthProviders?.length));
const autocomplete = computed(() => (withPasskey.value && props.onPasskeyAutofill ? "username webauthn" : "username"));
const inputWrap = ref<HTMLElement | null>(null);
onMounted(() => formRef.value?.querySelector<HTMLInputElement>('input[name="email"]')?.focus());

async function passkey() {
  passkeyPending.value = true;
  try {
    await props.onPasskey?.();
  } finally {
    passkeyPending.value = false;
  }
}
</script>

<template>
  <form
    ref="formRef"
    novalidate
    data-slot="sign-in-flow-email"
    :aria-busy="pending || undefined"
    class="flex flex-col gap-4"
    @submit.prevent="form.submit({ email: email.trim() })"
  >
    <NqAuthErrorSummary :ref="summaryEl" :error="form.error.value" :field-errors="fe" :field-labels="{ email: t.email }" :title="t.errorTitle" @focus-field="form.focusField" />
    <NqField name="email" :invalid="Boolean(fe.email)">
      <NqFieldLabel>{{ t.email }}</NqFieldLabel>
      <NqInput
        ref="inputWrap"
        v-model="email"
        type="email"
        name="email"
        ltr
        :autocomplete="autocomplete"
        inputmode="email"
        :placeholder="t.emailPlaceholder"
        :aria-invalid="fe.email ? true : undefined"
        @update:model-value="form.clear('email')"
      />
      <NqFieldError v-if="fe.email" match>{{ fe.email }}</NqFieldError>
    </NqField>
    <NqButton type="submit" variant="primary" size="lg" :loading="pending" :disabled="passkeyPending">{{ t.continue }}</NqButton>
  </form>
  <NqOAuthDivider v-if="hasAlternatives">{{ t.divider }}</NqOAuthDivider>
  <NqOAuthButtons
    v-if="props.oauthProviders?.length"
    :providers="props.oauthProviders"
    intent="continue"
    :on-select="(id: string) => props.onOAuth?.(id)"
    :disabled="busy"
    :last-used="props.lastUsed"
    :labels="{ lastUsed: t.lastUsed }"
  />
  <NqButton v-if="withPasskey" type="button" variant="secondary" :loading="passkeyPending" :disabled="pending" data-slot="sign-in-flow-passkey" class="relative" @click="passkey">
    <KeyRound aria-hidden="true" />
    {{ t.passkey }}
    <NqLastUsed v-if="props.lastUsed === 'passkey'">{{ t.lastUsed }}</NqLastUsed>
  </NqButton>
</template>
