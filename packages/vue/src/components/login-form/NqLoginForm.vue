<script setup lang="ts">
import { KeyRound, MailCheck, Terminal } from "lucide-vue-next";
import { computed, nextTick, reactive, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { formatCountdown } from "../auth-layout/auth-utils";
import { isEmail, useAuthForm, useAuthLocale, useConditionalPasskey, useCooldown, usePasskeySupport, type AuthSubmitResult, NqAuthErrorSummary } from "../auth-layout";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqOAuthButtons, NqOAuthDivider, type OAuthProvider } from "../oauth-buttons";
import { NqPasswordInput } from "../password-input";
import { STRINGS, type LoginFormLabels, type LoginMethod, type LoginValues } from "./strings";

// Email sign-in with a password, a magic link or both, plus remember me, a forgot-password slot, an optional passkey
// button, provider buttons and a dev-only shortcut. Presentational: it validates the shape, calls your handler, and
// shows what comes back. Slot: forgotPassword (beside the password label).
interface Props {
  /** Resolve with nothing on success, or `{ error, fieldErrors }` to show a failure. Throwing shows `labels.failed`. */
  onSubmit: (values: LoginValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  defaultEmail?: string;
  /** Show the "Remember me" checkbox. Default true. */
  showRemember?: boolean;
  /** Provider buttons under the form. Omit to hide them. */
  oauthProviders?: OAuthProvider[];
  onOAuth?: (id: string) => void | Promise<unknown>;
  /** Shows "Sign in with a passkey" when set and the browser supports WebAuthn. */
  onPasskey?: () => void | Promise<unknown>;
  /** Passkey autofill (conditional UI): called with an AbortSignal when the browser supports it. */
  onPasskeyAutofill?: (signal: AbortSignal) => void | Promise<unknown>;
  /** Send a one-time sign-in link. Adds "Email me a sign-in link"; on success the form shows "Check your email". */
  onMagicLink?: (values: { email: string }) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Seconds before the link can be sent again. Default 30. */
  magicLinkSeconds?: number;
  /** Which email methods to offer. Default: password, plus magic link when `onMagicLink` is set. An empty list shows a notice. */
  methods?: readonly LoginMethod[];
  /** A "Dev login" button for local development. Never pass it in production builds. */
  onDevLogin?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  labels?: Partial<LoginFormLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  defaultEmail: "",
  showRemember: true,
  oauthProviders: undefined,
  onOAuth: undefined,
  onPasskey: undefined,
  onPasskeyAutofill: undefined,
  onMagicLink: undefined,
  magicLinkSeconds: 30,
  methods: undefined,
  onDevLogin: undefined,
  labels: undefined,
});

type Intent = LoginMethod;
const locale = useAuthLocale();
const t = computed<LoginFormLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const methods = computed<readonly LoginMethod[]>(() => props.methods ?? (props.onMagicLink ? ["password", "magic-link"] : ["password"]));
const withPassword = computed(() => methods.value.includes("password"));
const withMagic = computed(() => methods.value.includes("magic-link") && Boolean(props.onMagicLink));
const blocked = computed(() => !withPassword.value && !withMagic.value);
const email = ref(props.defaultEmail);
const password = ref("");
const remember = ref(false);
const passkeySupported = usePasskeySupport();
const withPasskey = computed(() => Boolean(props.onPasskey) && passkeySupported.value && !blocked.value);
useConditionalPasskey(props.onPasskeyAutofill && props.onPasskey ? (signal) => props.onPasskeyAutofill?.(signal) : undefined);
const passkeyPending = ref(false);
const devPending = ref(false);
const intent = ref<Intent>("password");
const sentTo = ref<string | null>(null);
const cooldown = useCooldown();
const resendState = reactive<{ pending: boolean; error?: string; done?: boolean }>({ pending: false });
const headingRef = ref<HTMLElement | null>(null);

const form = useAuthForm<LoginValues & { intent: Intent }, "email" | "password">({
  fallbackError: t.value.failed,
  validate: (v) => ({
    email: v.email.trim() ? (isEmail(v.email) ? undefined : t.value.emailInvalid) : t.value.emailRequired,
    password: v.intent === "password" && !v.password ? t.value.passwordRequired : undefined,
  }),
  onSubmit: async ({ intent: how, ...values }) => {
    if (how === "password") return props.onSubmit(values);
    const result = await props.onMagicLink?.({ email: values.email });
    if (!result || (!result.error && !result.fieldErrors)) {
      sentTo.value = values.email;
      cooldown.start(props.magicLinkSeconds);
    }
    return result;
  },
});
const { formRef, pending, fieldErrors: fe } = form;
const busy = computed(() => pending.value || passkeyPending.value || devPending.value);
const summaryEl = (c: unknown) => {
  form.summaryRef.value = (c as { el?: HTMLElement | null } | null)?.el ?? null;
};

watch(sentTo, async (v) => {
  if (!v) return;
  await nextTick();
  headingRef.value?.focus();
});

const send = (how: Intent) => {
  intent.value = how;
  void form.submit({ email: email.value.trim(), password: password.value, remember: remember.value, intent: how });
};
const onFormSubmit = () => send(withPassword.value ? "password" : "magic-link");

async function passkey() {
  passkeyPending.value = true;
  try {
    await props.onPasskey?.();
  } finally {
    passkeyPending.value = false;
  }
}

async function devLogin() {
  if (busy.value) return;
  devPending.value = true;
  form.error.value = undefined;
  try {
    const result = await props.onDevLogin?.();
    if (result?.error) form.error.value = result.error;
  } catch {
    form.error.value = t.value.devFailed;
  } finally {
    devPending.value = false;
  }
}

async function resend() {
  if (!sentTo.value || cooldown.remaining.value > 0 || resendState.pending) return;
  resendState.pending = true;
  resendState.error = undefined;
  resendState.done = false;
  try {
    const result = await props.onMagicLink?.({ email: sentTo.value });
    if (result?.error) resendState.error = result.error;
    else {
      resendState.done = true;
      cooldown.start(props.magicLinkSeconds);
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

const magicPrimary = computed(() => withMagic.value && !withPassword.value);
const primaryIntent = computed<Intent>(() => (magicPrimary.value ? "magic-link" : "password"));
const sentParts = computed(() => {
  const [before = "", after = ""] = t.value.sentBody.split("{email}");
  return { before, after };
});
const emailAutocomplete = computed(() => (withPasskey.value && props.onPasskeyAutofill ? "username webauthn" : withPassword.value ? "username" : "email"));
</script>

<template>
  <div v-if="sentTo" data-slot="login-form" data-state="sent" :class="cn('flex w-full flex-col gap-4 text-start', props.class)">
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
    <NqButton type="button" variant="secondary" size="lg" :loading="resendState.pending" :disabled="cooldown.remaining.value > 0" data-slot="login-form-resend" @click="resend">
      {{ cooldown.remaining.value > 0 ? t.resendIn.replace("{time}", formatCountdown(cooldown.remaining.value)) : t.resend }}
    </NqButton>
    <NqButton type="button" variant="link" size="sm" class="self-start" @click="changeEmail">{{ t.changeEmail }}</NqButton>
  </div>

  <div v-else-if="blocked" data-slot="login-form" data-state="blocked" :class="cn('flex w-full flex-col gap-4', props.class)">
    <NqAlert tone="warning" :title="t.blockedTitle">{{ t.blockedBody }}</NqAlert>
    <NqAlert v-if="form.error.value" tone="danger">{{ form.error.value }}</NqAlert>
    <NqButton
      v-if="props.onDevLogin"
      type="button"
      variant="ghost"
      size="lg"
      :loading="devPending"
      :disabled="pending || passkeyPending"
      data-slot="login-form-dev"
      class="border border-dashed border-border text-muted-foreground"
      @click="devLogin"
    >
      <Terminal aria-hidden="true" />
      {{ t.devLogin }}
    </NqButton>
  </div>

  <form
    v-else
    ref="formRef"
    novalidate
    data-slot="login-form"
    data-state="idle"
    :aria-busy="pending || undefined"
    :class="cn('flex w-full flex-col gap-4', props.class)"
    @submit.prevent="onFormSubmit"
  >
    <NqAuthErrorSummary :ref="summaryEl" :error="form.error.value" :field-errors="fe" :field-labels="{ email: t.email, password: t.password }" :title="t.errorTitle" @focus-field="form.focusField" />
    <NqField name="email" :invalid="Boolean(fe.email)">
      <NqFieldLabel>{{ t.email }}</NqFieldLabel>
      <NqInput
        v-model="email"
        type="email"
        name="email"
        ltr
        :autocomplete="emailAutocomplete"
        inputmode="email"
        :placeholder="t.emailPlaceholder"
        :aria-invalid="fe.email ? true : undefined"
        @update:model-value="form.clear('email')"
      />
      <NqFieldError v-if="fe.email" match>{{ fe.email }}</NqFieldError>
    </NqField>
    <NqField v-if="withPassword" name="password" :invalid="Boolean(fe.password)">
      <div class="flex items-baseline justify-between gap-3">
        <NqFieldLabel>{{ t.password }}</NqFieldLabel>
        <span v-if="$slots.forgotPassword" class="text-caption"><slot name="forgotPassword" /></span>
      </div>
      <NqPasswordInput v-model="password" name="password" autocomplete="current-password" :aria-invalid="fe.password ? true : undefined" @update:model-value="form.clear('password')" />
      <NqFieldError v-if="fe.password" match>{{ fe.password }}</NqFieldError>
    </NqField>
    <label v-if="props.showRemember && withPassword" class="flex items-center gap-2 text-body-sm text-foreground">
      <NqCheckbox v-model="remember" name="remember" />
      {{ t.remember }}
    </label>
    <NqButton
      type="submit"
      variant="primary"
      size="lg"
      :loading="pending && intent === primaryIntent"
      :disabled="(busy && !pending) || (pending && intent !== primaryIntent)"
    >
      {{ magicPrimary ? t.magicLink : t.submit }}
    </NqButton>
    <NqButton
      v-if="withMagic && withPassword"
      type="button"
      variant="secondary"
      size="lg"
      :loading="pending && intent === 'magic-link'"
      :disabled="(busy && !pending) || (pending && intent !== 'magic-link')"
      data-slot="login-form-magic-link"
      @click="send('magic-link')"
    >
      <MailCheck aria-hidden="true" />
      {{ t.magicLink }}
    </NqButton>
    <NqOAuthDivider v-if="withPasskey || props.oauthProviders?.length">{{ t.divider }}</NqOAuthDivider>
    <NqButton v-if="withPasskey" type="button" variant="secondary" size="lg" :loading="passkeyPending" :disabled="pending || devPending" data-slot="login-form-passkey" @click="passkey">
      <KeyRound aria-hidden="true" />
      {{ t.passkey }}
    </NqButton>
    <NqOAuthButtons v-if="props.oauthProviders?.length" :providers="props.oauthProviders" intent="signin" :on-select="(id: string) => props.onOAuth?.(id)" :disabled="busy" />
    <NqButton
      v-if="props.onDevLogin"
      type="button"
      variant="ghost"
      size="lg"
      :loading="devPending"
      :disabled="pending || passkeyPending"
      data-slot="login-form-dev"
      class="border border-dashed border-border text-muted-foreground"
      @click="devLogin"
    >
      <Terminal aria-hidden="true" />
      {{ t.devLogin }}
    </NqButton>
  </form>
</template>
