<script setup lang="ts">
import { Building2 } from "lucide-vue-next";
import { onMounted } from "vue";
import { NqAuthErrorSummary, useAuthForm, type AuthSubmitResult } from "../auth-layout";
import { NqButton } from "../button";
import NqSignInFlowNotice from "./NqSignInFlowNotice.vue";
import type { SignInFlowLabels } from "./strings";

// The single sign-on step. Internal to SignInFlow.
const props = defineProps<{ t: SignInFlowLabels; email: string; connection?: string; onSso?: (email: string) => Promise<AuthSubmitResult> | AuthSubmitResult }>();
const form = useAuthForm<{ email: string }>({ fallbackError: props.t.failed, onSubmit: (v) => props.onSso?.(v.email) });
const { formRef, pending, fieldErrors: fe } = form;
const summaryEl = (c: unknown) => {
  form.summaryRef.value = (c as { el?: HTMLElement | null } | null)?.el ?? null;
};
onMounted(() => formRef.value?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus());
</script>

<template>
  <form ref="formRef" novalidate data-slot="sign-in-flow-sso" :aria-busy="pending || undefined" class="flex flex-col gap-4" @submit.prevent="form.submit({ email })">
    <NqAuthErrorSummary :ref="summaryEl" :error="form.error.value" :field-errors="fe" :title="t.errorTitle" />
    <NqSignInFlowNotice :title="t.ssoTitle" :body="t.ssoBody">
      <template #icon><Building2 aria-hidden="true" /></template>
    </NqSignInFlowNotice>
    <NqButton type="submit" variant="primary" size="lg" :loading="pending">{{ connection ? t.ssoWith.replace("{connection}", connection) : t.ssoContinue }}</NqButton>
  </form>
</template>
