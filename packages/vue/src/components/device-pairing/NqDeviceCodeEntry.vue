<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useAuthForm, useAuthLocale, type AuthSubmitResult } from "../auth-layout";
import { NqButton } from "../button";
import { NqOtpInput } from "../otp-input";
import { isUserCodeComplete, normalizeUserCode } from "./device-code";
import { STRINGS, type DevicePairingLabels } from "./strings";

// The page where someone types the code from their TV, CLI or app. Submits itself on the last character.
interface Props {
  /** Called with the normalised code (`WDJBMJHT`). Resolve `{ error }` for an unknown or used code. */
  onSubmit: (code: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Characters in the code. Default 8. */
  length?: number;
  /** A code from the link (`?user_code=`), pre-filled. */
  defaultCode?: string;
  labels?: Partial<DevicePairingLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { length: 8, defaultCode: "", labels: undefined });
const locale = useAuthLocale();
const t = computed<DevicePairingLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
const code = ref(normalizeUserCode(props.defaultCode).slice(0, props.length));

const form = useAuthForm<string, "code">({
  fallbackError: t.value.failed,
  validate: (v) => ({ code: isUserCodeComplete(v, props.length) ? undefined : fill(t.value.incomplete, { length: props.length }) }),
  onSubmit: async (value) => {
    const result = await props.onSubmit(value);
    if (result?.error || result?.fieldErrors) code.value = "";
    return result;
  },
});
const { formRef, pending, fieldErrors: fe } = form;
const message = computed(() => form.error.value ?? fe.value.code);

function onChange(value: string) {
  code.value = normalizeUserCode(value);
  form.clear("code");
  if (form.error.value) form.error.value = undefined;
}
</script>

<template>
  <form
    ref="formRef"
    novalidate
    data-slot="device-code-entry"
    :aria-busy="pending || undefined"
    :class="cn('flex w-full flex-col gap-4', props.class)"
    @submit.prevent="form.submit(normalizeUserCode(code))"
  >
    <NqOtpInput
      name="code"
      type="alphanumeric"
      :length="length"
      auto-focus
      :model-value="code"
      :invalid="Boolean(message)"
      :aria-label="t.entryGroup"
      :get-box-label="(i: number, n: number) => fill(t.box, { index: i + 1, length: n })"
      class="self-center uppercase"
      @update:model-value="onChange"
      @complete="(v: string) => form.submit(normalizeUserCode(v))"
    />
    <p role="alert" :class="cn('text-center text-caption text-nq-danger-text', !message && 'sr-only')">{{ message }}</p>
    <NqButton type="submit" variant="primary" size="lg" :loading="pending">{{ t.entrySubmit }}</NqButton>
  </form>
</template>
