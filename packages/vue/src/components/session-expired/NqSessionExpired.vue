<script setup lang="ts">
import { Clock, KeyRound } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqAuthErrorSummary, useAuthForm, useAuthLocale, usePasskeySupport, type AuthSubmitResult } from "../auth-layout";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { NqField, NqFieldError, NqFieldLabel } from "../field";
import type { LockUser } from "../lock-screen/strings";
import { NqOtpInput } from "../otp-input";
import { NqPasswordInput } from "../password-input";
import { STRINGS, type SessionExpiredLabels, type SessionExpiredReason, type SessionExpiredValues } from "./strings";

// The re-authentication screen for a session that ended: the same person, one password (and code) or a passkey away from
// continuing. Put it in an NqAuthLayout, like the other auth forms. It verifies nothing: `onSubmit` does. Use NqLockScreen for
// a session that is still valid but locked. Slot: footer.
interface Props {
  /** Who was signed in. The email is not asked again. */
  user: LockUser;
  /** Why the session ended. Default `expired`. */
  reason?: SessionExpiredReason;
  /** Ask for an authenticator code with the password. */
  requireCode?: boolean;
  /** Resolve with nothing once the session is back, or `{ error }` / `{ fieldErrors }`. */
  onSubmit: (values: SessionExpiredValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Shows the passkey button when the browser supports WebAuthn. */
  onPasskey?: () => void | Promise<unknown>;
  /** Shows "Use a different account". */
  onSwitchAccount?: () => void;
  onSignOut?: () => void;
  /** Tells people their unsaved work is safe (true) or not mentioned (default). */
  keepsWork?: boolean;
  labels?: Partial<SessionExpiredLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { reason: "expired", requireCode: false, onPasskey: undefined, onSwitchAccount: undefined, onSignOut: undefined, keepsWork: false, labels: undefined });
defineSlots<{ footer?: () => unknown }>();

const locale = useAuthLocale();
const t = computed<SessionExpiredLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const password = ref("");
const code = ref("");
const passkeyPending = ref(false);
const passkeySupported = usePasskeySupport();
const withPasskey = computed(() => Boolean(props.onPasskey) && passkeySupported.value);

const form = useAuthForm<SessionExpiredValues, "password" | "code">({
  onSubmit: (values) => props.onSubmit(values),
  fallbackError: t.value.failed,
  validate: (v) => ({
    password: v.password ? undefined : t.value.passwordRequired,
    code: props.requireCode && (v.code ?? "").length !== 6 ? t.value.codeRequired : undefined,
  }),
});
const { formRef, pending, fieldErrors: fe } = form;
const summaryEl = (c: unknown) => {
  form.summaryRef.value = (c as { el?: HTMLElement | null } | null)?.el ?? null;
};
const busy = computed(() => pending.value || passkeyPending.value);
const title = computed(() => (props.reason === "revoked" ? t.value.revoked : props.reason === "password-changed" ? t.value.passwordChanged : t.value.expired));
const hint = computed(() => (props.reason === "revoked" ? t.value.revokedHint : props.reason === "password-changed" ? t.value.passwordChangedHint : t.value.expiredHint));
const boxLabel = (i: number) => t.value.box.replace("{index}", String(i + 1));

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
    data-slot="session-expired"
    :data-reason="reason"
    :aria-busy="pending || undefined"
    :class="cn('flex w-full flex-col gap-4', props.class)"
    @submit.prevent="form.submit({ password, code: requireCode ? code : undefined })"
  >
    <NqAlert tone="warning" :title="title" :icon="Clock">
      {{ hint }}
      <span v-if="keepsWork" class="mt-1 block">{{ t.lostWork }}</span>
    </NqAlert>

    <div data-slot="session-expired-user" class="flex items-center gap-3 rounded-control border border-border bg-muted/50 p-3">
      <NqAvatar :name="user.name" :src="user.avatar" />
      <div class="flex min-w-0 flex-col text-start">
        <span class="truncate text-label text-foreground">{{ user.name }}</span>
        <bdi v-if="user.email" dir="ltr" class="truncate text-caption text-muted-foreground">{{ user.email }}</bdi>
      </div>
    </div>

    <NqAuthErrorSummary :ref="summaryEl" :error="form.error.value" :field-errors="fe" :field-labels="{ password: t.password, code: t.codeLabel }" :title="t.errorTitle" @focus-field="form.focusField" />
    <!-- The account is already known: a hidden username lets password managers fill the right entry. -->
    <input type="text" name="username" autocomplete="username" :value="user.email ?? user.name" readonly hidden />
    <NqField name="password" :invalid="Boolean(fe.password)">
      <NqFieldLabel>{{ t.password }}</NqFieldLabel>
      <NqPasswordInput v-model="password" name="password" autofocus autocomplete="current-password" :aria-invalid="fe.password ? true : undefined" @update:model-value="form.clear('password')" />
      <NqFieldError v-if="fe.password" match>{{ fe.password }}</NqFieldError>
    </NqField>
    <div v-if="requireCode" class="flex flex-col gap-2">
      <span class="text-label text-foreground">{{ t.codeLabel }}</span>
      <NqOtpInput v-model="code" name="code" :length="6" :invalid="Boolean(fe.code)" :aria-label="t.codeLabel" :get-box-label="boxLabel" @update:model-value="form.clear('code')" />
    </div>
    <NqButton type="submit" variant="primary" size="lg" :loading="pending" :disabled="passkeyPending">{{ t.submit }}</NqButton>
    <NqButton v-if="withPasskey" type="button" variant="secondary" size="lg" :loading="passkeyPending" :disabled="pending" data-slot="session-expired-passkey" @click="passkey">
      <KeyRound aria-hidden="true" />
      {{ t.passkey }}
    </NqButton>
    <div v-if="onSwitchAccount || onSignOut" class="flex flex-wrap items-center justify-between gap-2">
      <NqButton v-if="onSwitchAccount" type="button" variant="link" size="sm" :disabled="busy" @click="onSwitchAccount()">{{ t.switchAccount }}</NqButton>
      <span v-else />
      <NqButton v-if="onSignOut" type="button" variant="link" size="sm" :disabled="busy" @click="onSignOut()">{{ t.signOut }}</NqButton>
    </div>
    <slot name="footer" />
  </form>
</template>
