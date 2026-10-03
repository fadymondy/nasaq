<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAuthErrorSummary, isEmail, useAuthForm, useAuthLocale, type AuthSubmitResult } from "../auth-layout";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqOAuthButtons, NqOAuthDivider, type OAuthProvider } from "../oauth-buttons";
import { NqPasswordInput } from "../password-input";
import { STRINGS, type RegisterFormLabels, type RegisterValues } from "./strings";

// Sign-up: name, email, a password with a strength meter, confirmation, a terms checkbox and optional provider buttons.
// The confirmation match and minimum length are checked before `onSubmit` runs. Slot: terms (the sentence, with links).
interface Props {
  /** Resolve with nothing on success, or `{ error, fieldErrors }` (keys: name, email, password, confirm, terms). */
  onSubmit: (values: RegisterValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Minimum password length checked before `onSubmit`. Default 8. */
  minPasswordLength?: number;
  /** Require the terms checkbox. Default true. */
  requireTerms?: boolean;
  oauthProviders?: OAuthProvider[];
  onOAuth?: (id: string) => void | Promise<unknown>;
  labels?: Partial<RegisterFormLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { minPasswordLength: 8, requireTerms: true, oauthProviders: undefined, onOAuth: undefined, labels: undefined });

const locale = useAuthLocale();
const t = computed<RegisterFormLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const min = computed(() => String(props.minPasswordLength));
const name = ref("");
const email = ref("");
const password = ref("");
const confirm = ref("");
const accepted = ref(false);

const form = useAuthForm<RegisterValues, "name" | "email" | "password" | "confirm" | "terms">({
  onSubmit: (values) => props.onSubmit(values),
  fallbackError: t.value.failed,
  validate: (v) => ({
    name: v.name.trim() ? undefined : t.value.nameRequired,
    email: v.email.trim() ? (isEmail(v.email) ? undefined : t.value.emailInvalid) : t.value.emailRequired,
    password: [...v.password].length >= props.minPasswordLength ? undefined : t.value.passwordShort.replace("{min}", min.value),
    confirm: confirm.value === v.password ? undefined : t.value.confirmMismatch,
    terms: !props.requireTerms || v.acceptTerms ? undefined : t.value.termsRequired,
  }),
});
const { formRef, pending, fieldErrors: fe } = form;
const summaryEl = (c: unknown) => {
  form.summaryRef.value = (c as { el?: HTMLElement | null } | null)?.el ?? null;
};
const submit = () => form.submit({ name: name.value.trim(), email: email.value.trim(), password: password.value, acceptTerms: accepted.value });
</script>

<template>
  <form ref="formRef" novalidate data-slot="register-form" :aria-busy="pending || undefined" :class="cn('flex w-full flex-col gap-4', props.class)" @submit.prevent="submit">
    <template v-if="props.oauthProviders?.length">
      <NqOAuthButtons :providers="props.oauthProviders" intent="signup" :on-select="(id: string) => props.onOAuth?.(id)" :disabled="pending" />
      <NqOAuthDivider>{{ t.divider }}</NqOAuthDivider>
    </template>
    <NqAuthErrorSummary
      :ref="summaryEl"
      :error="form.error.value"
      :field-errors="fe"
      :field-labels="{ name: t.name, email: t.email, password: t.password, confirm: t.confirm }"
      :title="t.errorTitle"
      @focus-field="form.focusField"
    />
    <NqField name="name" :invalid="Boolean(fe.name)">
      <NqFieldLabel>{{ t.name }}</NqFieldLabel>
      <NqInput v-model="name" name="name" autocomplete="name" :placeholder="t.namePlaceholder" :aria-invalid="fe.name ? true : undefined" @update:model-value="form.clear('name')" />
      <NqFieldError v-if="fe.name" match>{{ fe.name }}</NqFieldError>
    </NqField>
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
    <NqField name="password" :invalid="Boolean(fe.password)">
      <NqFieldLabel>{{ t.password }}</NqFieldLabel>
      <NqPasswordInput v-model="password" name="password" autocomplete="new-password" show-strength :aria-invalid="fe.password ? true : undefined" @update:model-value="form.clear('password')" />
      <NqFieldError v-if="fe.password" match>{{ fe.password }}</NqFieldError>
      <NqFieldDescription v-else>{{ t.passwordHint.replace("{min}", min) }}</NqFieldDescription>
    </NqField>
    <NqField name="confirm" :invalid="Boolean(fe.confirm)">
      <NqFieldLabel>{{ t.confirm }}</NqFieldLabel>
      <NqPasswordInput v-model="confirm" name="confirm" autocomplete="new-password" :aria-invalid="fe.confirm ? true : undefined" @update:model-value="form.clear('confirm')" />
      <NqFieldError v-if="fe.confirm" match>{{ fe.confirm }}</NqFieldError>
    </NqField>
    <NqField v-if="props.requireTerms" name="terms" :invalid="Boolean(fe.terms)">
      <label class="flex items-start gap-2 text-body-sm text-foreground">
        <NqCheckbox v-model="accepted" name="terms" class="mt-0.5" :aria-invalid="fe.terms ? true : undefined" @update:model-value="form.clear('terms')" />
        <span><slot name="terms">{{ t.terms }}</slot></span>
      </label>
      <NqFieldError v-if="fe.terms" match>{{ fe.terms }}</NqFieldError>
    </NqField>
    <NqButton type="submit" variant="primary" size="lg" :loading="pending">{{ t.submit }}</NqButton>
  </form>
</template>
