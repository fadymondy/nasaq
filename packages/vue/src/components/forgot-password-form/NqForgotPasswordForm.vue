<script setup lang="ts">
import { MailCheck } from "lucide-vue-next";
import { computed, nextTick, reactive, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { formatCountdown } from "../auth-layout/auth-utils";
import { NqAuthErrorSummary, isEmail, useAuthForm, useAuthLocale, useCooldown, type AuthSubmitResult } from "../auth-layout";
import { NqButton } from "../button";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { STRINGS, type ForgotPasswordFormLabels, type ForgotPasswordValues } from "./strings";

// Ask for an email, then show "Check your inbox" with a resend button on a cooldown. The response never says whether the
// address has an account, so it does not leak which emails are registered.
interface Props {
  /** Called with the email. Resolve with nothing on success (the form then shows "Check your inbox"). */
  onSubmit: (values: ForgotPasswordValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Called by "Resend email" with the same address. Default: `onSubmit` again. */
  onResend?: (values: ForgotPasswordValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Seconds before the email can be resent. Default 30. */
  resendSeconds?: number;
  defaultEmail?: string;
  labels?: Partial<ForgotPasswordFormLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onResend: undefined, resendSeconds: 30, defaultEmail: "", labels: undefined });

const locale = useAuthLocale();
const t = computed<ForgotPasswordFormLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const email = ref(props.defaultEmail);
const sentTo = ref<string | null>(null);
const cooldown = useCooldown();
const headingRef = ref<HTMLElement | null>(null);
const resendState = reactive<{ pending: boolean; error?: string; done?: boolean }>({ pending: false });

const form = useAuthForm<ForgotPasswordValues, "email">({
  fallbackError: t.value.failed,
  validate: (v) => ({ email: v.email.trim() ? (isEmail(v.email) ? undefined : t.value.emailInvalid) : t.value.emailRequired }),
  onSubmit: async (values) => {
    const result = await props.onSubmit(values);
    if (!result || (!result.error && !result.fieldErrors)) {
      sentTo.value = values.email;
      cooldown.start(props.resendSeconds);
    }
    return result;
  },
});
const { formRef, pending, fieldErrors: fe } = form;
const summaryEl = (c: unknown) => {
  form.summaryRef.value = (c as { el?: HTMLElement | null } | null)?.el ?? null;
};

watch(sentTo, async (v) => {
  if (!v) return;
  await nextTick();
  headingRef.value?.focus();
});

async function resend() {
  if (!sentTo.value || cooldown.remaining.value > 0 || resendState.pending) return;
  resendState.pending = true;
  resendState.error = undefined;
  resendState.done = false;
  try {
    const result = await (props.onResend ?? props.onSubmit)({ email: sentTo.value });
    if (result?.error) resendState.error = result.error;
    else {
      resendState.done = true;
      cooldown.start(props.resendSeconds);
    }
  } catch {
    resendState.error = t.value.failed;
  } finally {
    resendState.pending = false;
  }
}

function changeEmail() {
  sentTo.value = null;
  resendState.pending = false;
  resendState.error = undefined;
  resendState.done = false;
}

const sentParts = computed(() => {
  const [before = "", after = ""] = t.value.sentBody.split("{email}");
  return { before, after };
});
</script>

<template>
  <div v-if="sentTo" data-slot="forgot-password-form" data-state="sent" :class="cn('flex w-full flex-col gap-4 text-start', props.class)">
    <div class="flex size-10 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
      <MailCheck aria-hidden="true" class="size-5" />
    </div>
    <div role="status" class="flex flex-col gap-1.5">
      <h2 ref="headingRef" tabindex="-1" class="text-h3 text-foreground outline-none">{{ t.sentTitle }}</h2>
      <p class="text-body-sm text-muted-foreground">
        {{ sentParts.before }}<bdi dir="ltr" class="font-medium text-foreground">{{ sentTo }}</bdi>{{ sentParts.after }}
      </p>
    </div>
    <NqAlert v-if="resendState.error" tone="danger">{{ resendState.error }}</NqAlert>
    <span role="status" class="sr-only">{{ resendState.done && cooldown.remaining.value > 0 ? t.resent : "" }}</span>
    <NqButton type="button" variant="secondary" size="lg" :loading="resendState.pending" :disabled="cooldown.remaining.value > 0" data-slot="forgot-password-resend" @click="resend">
      {{ cooldown.remaining.value > 0 ? t.resendIn.replace("{time}", formatCountdown(cooldown.remaining.value)) : t.resend }}
    </NqButton>
    <NqButton type="button" variant="link" size="sm" class="self-start" @click="changeEmail">{{ t.changeEmail }}</NqButton>
  </div>

  <div v-else data-slot="forgot-password-form" data-state="idle" :class="cn('w-full', props.class)">
    <form ref="formRef" novalidate :aria-busy="pending || undefined" class="flex w-full flex-col gap-4" @submit.prevent="form.submit({ email: email.trim() })">
      <NqAuthErrorSummary :ref="summaryEl" :error="form.error.value" :field-errors="fe" :field-labels="{ email: t.email }" :title="t.errorTitle" @focus-field="form.focusField" />
      <NqField name="email" :invalid="Boolean(fe.email)">
        <NqFieldLabel>{{ t.email }}</NqFieldLabel>
        <NqInput
          v-model="email"
          type="email"
          name="email"
          ltr
          autocomplete="email"
          inputmode="email"
          :placeholder="t.emailPlaceholder"
          :aria-invalid="fe.email ? true : undefined"
          @update:model-value="form.clear('email')"
        />
        <NqFieldError v-if="fe.email" match>{{ fe.email }}</NqFieldError>
      </NqField>
      <NqButton type="submit" variant="primary" size="lg" :loading="pending">{{ t.submit }}</NqButton>
    </form>
  </div>
</template>
