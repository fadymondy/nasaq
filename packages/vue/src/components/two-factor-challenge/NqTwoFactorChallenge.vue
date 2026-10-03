<script setup lang="ts">
import { KeyRound } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useAuthForm, useAuthLocale, usePasskeySupport, type AuthSubmitResult } from "../auth-layout";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqOtpInput } from "../otp-input";
import { STRINGS, type TwoFactorChallengeLabels, type TwoFactorMethod, type TwoFactorValues } from "./strings";

// The second step of sign-in: an authenticator code (auto-submits on the last digit), a switch to a one-time recovery code,
// a "trust this device" checkbox and an optional passkey alternative.
interface Props {
  /** Resolve with nothing on success, or `{ error }` for a wrong code (the input clears and refocuses). */
  onSubmit: (values: TwoFactorValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Shows "Use a passkey instead" when set and the browser supports WebAuthn. */
  onPasskey?: () => void | Promise<unknown>;
  /** Which method to start on. Default `totp`. */
  defaultMethod?: TwoFactorMethod;
  /** Show the "Trust this device" checkbox. Default true. */
  showTrustDevice?: boolean;
  /** Authenticator code length. Default 6. */
  length?: number;
  labels?: Partial<TwoFactorChallengeLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onPasskey: undefined, defaultMethod: "totp", showTrustDevice: true, length: 6, labels: undefined });

const locale = useAuthLocale();
const t = computed<TwoFactorChallengeLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
const method = ref<TwoFactorMethod>(props.defaultMethod);
const code = ref("");
const trust = ref(false);
const passkeyPending = ref(false);
const passkeySupported = usePasskeySupport();
const messageId = useId();

const form = useAuthForm<TwoFactorValues, "code">({
  fallbackError: t.value.failed,
  validate: (v) => ({
    code: v.method === "totp" ? (v.code.length === props.length ? undefined : fill(t.value.incomplete, { length: props.length })) : v.code.trim() ? undefined : t.value.recoveryRequired,
  }),
  onSubmit: async (values) => {
    try {
      const result = await props.onSubmit(values);
      if (result?.error || result?.fieldErrors) code.value = "";
      return result;
    } catch (error) {
      code.value = "";
      throw error;
    }
  },
});
const { formRef, pending, fieldErrors: fe } = form;
const message = computed(() => form.error.value ?? fe.value.code);
const send = (value: string) => void form.submit({ code: value.trim(), method: method.value, trustDevice: trust.value });

function onChange(value: string) {
  code.value = value;
  form.clear("code");
  if (form.error.value) form.error.value = undefined;
}

function switchMethod() {
  method.value = method.value === "totp" ? "recovery" : "totp";
  code.value = "";
  form.error.value = undefined;
  fe.value = {};
}

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
    data-slot="two-factor-challenge"
    :data-method="method"
    :aria-busy="pending || undefined"
    :class="cn('flex w-full flex-col gap-4', props.class)"
    @submit.prevent="send(code)"
  >
    <p class="text-body-sm text-muted-foreground">{{ method === "totp" ? fill(t.totpDescription, { length }) : t.recoveryDescription }}</p>
    <div v-if="method === 'totp'" class="flex flex-col gap-2">
      <NqOtpInput
        key="totp"
        name="code"
        :length="length"
        auto-focus
        :model-value="code"
        :invalid="Boolean(message)"
        :aria-label="t.totpGroup"
        :aria-describedby="message ? messageId : undefined"
        :get-box-label="(i: number, n: number) => fill(t.box, { index: i + 1, length: n })"
        class="self-center"
        @update:model-value="(v) => onChange(String(v ?? ''))"
        @complete="send"
      />
      <p :id="messageId" role="alert" :class="cn('text-center text-caption text-nq-danger-text', !message && 'sr-only')">{{ message }}</p>
    </div>
    <NqField v-else name="code" :invalid="Boolean(message)">
      <NqFieldLabel>{{ t.recoveryLabel }}</NqFieldLabel>
      <NqInput
        key="recovery"
        v-model="code"
        name="code"
        ltr
        auto-focus
        autocomplete="off"
        autocapitalize="none"
        :spellcheck="false"
        :placeholder="t.recoveryPlaceholder"
        class="font-mono"
        :aria-invalid="message ? true : undefined"
        @update:model-value="(v) => onChange(String(v ?? ''))"
      />
      <NqFieldError v-if="message" match>{{ message }}</NqFieldError>
    </NqField>
    <label v-if="showTrustDevice" class="flex items-center gap-2 text-body-sm text-foreground">
      <NqCheckbox v-model="trust" name="trustDevice" />
      {{ t.trust }}
    </label>
    <NqButton type="submit" variant="primary" size="lg" :loading="pending" :disabled="passkeyPending">{{ t.submit }}</NqButton>
    <div class="flex flex-col items-center gap-1">
      <NqButton type="button" variant="link" size="sm" :disabled="pending" @click="switchMethod">{{ method === "totp" ? t.useRecovery : t.useTotp }}</NqButton>
      <NqButton v-if="onPasskey && passkeySupported" type="button" variant="link" size="sm" :loading="passkeyPending" :disabled="pending" data-slot="two-factor-passkey" @click="passkey">
        <KeyRound aria-hidden="true" />
        {{ t.usePasskey }}
      </NqButton>
    </div>
    <div v-if="$slots.footer" class="text-center text-body-sm"><slot name="footer" /></div>
  </form>
</template>
