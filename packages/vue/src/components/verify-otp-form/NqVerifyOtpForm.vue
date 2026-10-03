<script setup lang="ts">
import { computed, reactive, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { formatCountdown } from "../auth-layout/auth-utils";
import { useAuthForm, useAuthLocale, useCooldown, type AuthSubmitResult } from "../auth-layout";
import { NqButton } from "../button";
import { NqOtpInput } from "../otp-input";
import { STRINGS, maskDestination, type VerifyOtpFormLabels, type VerifyOtpValues } from "./strings";

// Verify an emailed or texted one-time code: a masked destination, submit when the last digit lands (or on paste), clear and
// refocus on a wrong code, and a resend button on a countdown.
interface Props {
  /** The email address or phone number the code went to. It is masked before it is shown. */
  destination: string;
  channel?: "email" | "sms";
  /** Code length. Default 6. */
  length?: number;
  /** Called with the code. Resolve with `{ error }` for a wrong or expired code (the boxes clear and refocus). */
  onSubmit: (values: VerifyOtpValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Called by "Resend code". Resolve with `{ error }` to show why it failed. Omit to hide the resend button. */
  onResend?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Seconds between resends; also the wait before the first one. Default 30. */
  resendSeconds?: number;
  /** Submit as soon as the last digit is entered. Default true. */
  autoSubmit?: boolean;
  labels?: Partial<VerifyOtpFormLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { channel: "email", length: 6, onResend: undefined, resendSeconds: 30, autoSubmit: true, labels: undefined });

const locale = useAuthLocale();
const t = computed<VerifyOtpFormLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
const code = ref("");
const messageId = useId();
const cooldown = useCooldown(props.onResend ? props.resendSeconds : 0);
const resend = reactive<{ pending: boolean; error?: string; sent?: boolean }>({ pending: false });

const form = useAuthForm<VerifyOtpValues, "code">({
  fallbackError: t.value.failed,
  validate: (v) => ({ code: v.code.length === props.length ? undefined : fill(t.value.incomplete, { length: props.length }) }),
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
const message = computed(() => form.error.value ?? fe.value.code ?? resend.error);

const focusFirst = () => formRef.value?.querySelector("input")?.focus();

async function doResend() {
  if (!props.onResend || cooldown.remaining.value > 0 || resend.pending) return;
  resend.pending = true;
  resend.error = undefined;
  try {
    const result = await props.onResend();
    if (result?.error) resend.error = result.error;
    else {
      resend.sent = true;
      cooldown.start(props.resendSeconds);
      code.value = "";
      focusFirst();
    }
  } catch {
    resend.error = t.value.failed;
  } finally {
    resend.pending = false;
  }
}

function onChange(value: string) {
  code.value = value;
  form.clear("code");
  if (form.error.value) form.error.value = undefined;
  if (resend.error) resend.error = undefined;
}

function onComplete(value: string) {
  if (props.autoSubmit) void form.submit({ code: value });
}

const parts = computed(() => {
  const [before = "", after = ""] = fill(props.channel === "sms" ? t.value.descriptionSms : t.value.descriptionEmail, { length: props.length, destination: "\u0000" }).split("\u0000");
  return { before, after };
});
</script>

<template>
  <form
    ref="formRef"
    novalidate
    data-slot="verify-otp-form"
    :aria-busy="pending || undefined"
    :class="cn('flex w-full flex-col gap-4', props.class)"
    @submit.prevent="form.submit({ code })"
  >
    <p class="text-body-sm text-muted-foreground">
      {{ parts.before }}<bdi dir="ltr" class="font-medium text-foreground">{{ maskDestination(destination, channel) }}</bdi>{{ parts.after }}
    </p>
    <div class="flex flex-col gap-2">
      <NqOtpInput
        name="code"
        :length="length"
        auto-focus
        :model-value="code"
        :invalid="Boolean(message)"
        :aria-label="t.group"
        :aria-describedby="message ? messageId : undefined"
        :get-box-label="(i: number, n: number) => fill(t.box, { index: i + 1, length: n })"
        class="self-center"
        @update:model-value="onChange"
        @complete="onComplete"
      />
      <p :id="messageId" role="alert" :class="cn('text-center text-caption text-nq-danger-text', !message && 'sr-only')">{{ message }}</p>
    </div>
    <NqButton type="submit" variant="primary" size="lg" :loading="pending">{{ t.submit }}</NqButton>
    <div v-if="onResend" class="flex flex-wrap items-center justify-center gap-x-1 text-body-sm text-muted-foreground">
      <span>{{ t.noCode }}</span>
      <NqButton type="button" variant="link" size="sm" :loading="resend.pending" :disabled="cooldown.remaining.value > 0" data-slot="verify-otp-resend" @click="doResend">
        {{ cooldown.remaining.value > 0 ? fill(t.resendIn, { time: formatCountdown(cooldown.remaining.value) }) : t.resend }}
      </NqButton>
    </div>
    <span role="status" class="sr-only">{{ resend.sent ? t.resent : "" }}</span>
    <div v-if="$slots.footer" class="text-center text-body-sm"><slot name="footer" /></div>
  </form>
</template>
