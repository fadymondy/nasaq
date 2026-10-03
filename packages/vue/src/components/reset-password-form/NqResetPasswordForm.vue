<script setup lang="ts">
import { CircleCheck, Link as LinkIcon } from "lucide-vue-next";
import { computed, nextTick, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAuthErrorSummary, useAuthForm, useAuthLocale, type AuthSubmitFailure } from "../auth-layout";
import { NqButton } from "../button";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel } from "../field";
import { NqPasswordInput, computePasswordRules, computeRuleScore, passwordMeetsPolicy, type PasswordPolicy } from "../password-input";
import { STRINGS, type ResetPasswordFormLabels, type ResetPasswordState, type ResetPasswordTarget, type ResetPasswordValues } from "./strings";

// Choose a new password after following a reset link: new and confirm fields, a strength meter and an optional
// requirement checklist. After submit it shows "Password changed" with a Sign in button, or "This link has expired" with
// a Send a new link button. `onSubmit` may resolve `{ expired: true }` for a used or old link.
interface Props {
  onSubmit: (values: ResetPasswordValues) => Promise<void | AuthSubmitFailure | { expired: true }> | void | AuthSubmitFailure | { expired: true };
  /** Minimum length checked before `onSubmit`. Default 8, or the policy's minimum when `rules` is a policy. */
  minPasswordLength?: number;
  /** Show the requirement checklist and require every rule. `true` is 12 characters with upper, lower, digit and symbol. */
  rules?: boolean | PasswordPolicy;
  /** Start in a state, e.g. "expired" when the token was checked on load. Use `v-model:state` to control it. */
  defaultState?: ResetPasswordState;
  /** The Sign in button on success: a URL or a handler. Without it the button is hidden. */
  signIn?: ResetPasswordTarget;
  /** The Send a new link button on an expired link: a URL or a handler. Without it the button is hidden. */
  requestLink?: ResetPasswordTarget;
  labels?: Partial<ResetPasswordFormLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { minPasswordLength: undefined, rules: undefined, defaultState: "idle", signIn: undefined, requestLink: undefined, labels: undefined });
const state = defineModel<ResetPasswordState | undefined>("state");

const locale = useAuthLocale();
const t = computed<ResetPasswordFormLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const policy = computed<PasswordPolicy | null>(() => (props.rules ? (props.rules === true ? {} : props.rules) : null));
const minLength = computed(() => props.minPasswordLength ?? (policy.value ? (policy.value.minLength ?? 12) : 8));
const min = computed(() => String(minLength.value));
const password = ref("");
const confirm = ref("");
const own = ref<ResetPasswordState>(props.defaultState);
const current = computed(() => state.value ?? own.value);
const headingRef = ref<HTMLElement | null>(null);
const setState = (next: ResetPasswordState) => {
  if (state.value === undefined) own.value = next;
  state.value = next;
};
const checks = computed(() => (policy.value ? computePasswordRules(password.value, { ...policy.value, minLength: minLength.value }) : null));

const form = useAuthForm<ResetPasswordValues, "password" | "confirm">({
  fallbackError: t.value.failed,
  validate: (v) => ({
    password:
      v.password.length < minLength.value ? t.value.passwordShort.replace("{min}", min.value) : checks.value && !passwordMeetsPolicy(checks.value) ? t.value.passwordWeak : undefined,
    confirm: confirm.value === v.password ? undefined : t.value.confirmMismatch,
  }),
  onSubmit: async (values) => {
    const result = await props.onSubmit(values);
    if (result && "expired" in result && result.expired) {
      setState("expired");
      return;
    }
    const failure = result as AuthSubmitFailure | void;
    if (!failure || (!failure.error && !failure.fieldErrors)) setState("success");
    return failure;
  },
});
const { formRef, pending, fieldErrors: fe } = form;
const summaryEl = (c: unknown) => {
  form.summaryRef.value = (c as { el?: HTMLElement | null } | null)?.el ?? null;
};

watch(current, async (v) => {
  if (v === "idle") return;
  await nextTick();
  headingRef.value?.focus();
});
const success = computed(() => current.value === "success");
const targetProps = (to: ResetPasswordTarget) => (typeof to === "string" ? { as: "a", href: to } : { onClick: to });
</script>

<template>
  <div v-if="current !== 'idle'" data-slot="reset-password-form" :data-state="current" :class="cn('flex w-full flex-col gap-4 text-start', props.class)">
    <div :class="cn('flex size-10 items-center justify-center rounded-full', success ? 'bg-nq-success-soft text-nq-success-text' : 'bg-nq-warning-soft text-nq-warning-text')">
      <CircleCheck v-if="success" aria-hidden="true" class="size-5" />
      <LinkIcon v-else aria-hidden="true" class="size-5" />
    </div>
    <div role="status" class="flex flex-col gap-1.5">
      <h2 ref="headingRef" tabindex="-1" class="text-h3 text-foreground outline-none">{{ success ? t.successTitle : t.expiredTitle }}</h2>
      <p class="text-body-sm text-muted-foreground">{{ success ? t.successBody : t.expiredBody }}</p>
    </div>
    <NqButton v-if="success && props.signIn" variant="primary" size="lg" v-bind="targetProps(props.signIn)">{{ t.signIn }}</NqButton>
    <NqButton v-if="!success && props.requestLink" variant="primary" size="lg" v-bind="targetProps(props.requestLink)">{{ t.requestLink }}</NqButton>
  </div>

  <div v-else data-slot="reset-password-form" data-state="idle" :class="cn('w-full', props.class)">
    <form ref="formRef" novalidate :aria-busy="pending || undefined" class="flex w-full flex-col gap-4" @submit.prevent="form.submit({ password })">
      <NqAuthErrorSummary :ref="summaryEl" :error="form.error.value" :field-errors="fe" :field-labels="{ password: t.password, confirm: t.confirm }" :title="t.errorTitle" @focus-field="form.focusField" />
      <NqField name="password" :invalid="Boolean(fe.password)">
        <NqFieldLabel>{{ t.password }}</NqFieldLabel>
        <NqPasswordInput
          v-model="password"
          name="password"
          autocomplete="new-password"
          show-strength
          :score="checks ? computeRuleScore(checks) : undefined"
          :rules="policy ? { ...policy, minLength } : undefined"
          :aria-invalid="fe.password ? true : undefined"
          @update:model-value="form.clear('password')"
        />
        <NqFieldError v-if="fe.password" match>{{ fe.password }}</NqFieldError>
        <NqFieldDescription v-else-if="!checks">{{ t.passwordHint.replace("{min}", min) }}</NqFieldDescription>
      </NqField>
      <NqField name="confirm" :invalid="Boolean(fe.confirm)">
        <NqFieldLabel>{{ t.confirm }}</NqFieldLabel>
        <NqPasswordInput v-model="confirm" name="confirm" autocomplete="new-password" :aria-invalid="fe.confirm ? true : undefined" @update:model-value="form.clear('confirm')" />
        <NqFieldError v-if="fe.confirm" match>{{ fe.confirm }}</NqFieldError>
      </NqField>
      <NqButton type="submit" variant="primary" size="lg" :loading="pending">{{ t.submit }}</NqButton>
    </form>
  </div>
</template>
