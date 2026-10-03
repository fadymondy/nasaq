<script setup lang="ts">
import { ArrowLeft, ShieldOff, UserPlus } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useAuthLocale, type AuthSubmitResult } from "../auth-layout";
import { NqButton } from "../button";
import { NqForgotPasswordForm } from "../forgot-password-form";
import type { OAuthProvider } from "../oauth-buttons";
import { NqTwoFactorChallenge } from "../two-factor-challenge";
import type { TwoFactorValues } from "../two-factor-challenge/strings";
import { NqVerifyOtpForm } from "../verify-otp-form";
import NqSignInFlowEmailStep from "./NqSignInFlowEmailStep.vue";
import NqSignInFlowIdentity from "./NqSignInFlowIdentity.vue";
import NqSignInFlowLinkSent from "./NqSignInFlowLinkSent.vue";
import NqSignInFlowNotice from "./NqSignInFlowNotice.vue";
import NqSignInFlowPasswordStep from "./NqSignInFlowPasswordStep.vue";
import NqSignInFlowSsoStep from "./NqSignInFlowSsoStep.vue";
import { STRINGS, type SignInAlternative, type SignInFlowLabels, type SignInNext, type SignInPasswordResult, type SignInStep } from "./strings";

// Identifier-first sign-in. The page starts with only an email field and the provider buttons; the backend then picks the next
// step for that address: a password, a one-time code, a sign-in link, the organisation's SSO, sign-up, or a "can't sign in
// here" notice. After a password it can ask for a second factor, and "Forgot password?" opens the reset request in place.
// Slot: forgotPassword (beside the password label).
interface Props {
  /** The email step. Resolve with the next step, or a failure to stay on the email step. Nothing goes to the default step. */
  onIdentify?: (email: string) => Promise<SignInNext | AuthSubmitResult> | SignInNext | AuthSubmitResult;
  /** The password step. Resolve with nothing on success, or `{ twoFactor: true }` to ask for a second factor. */
  onPassword?: (values: { email: string; password: string; remember: boolean }) => Promise<SignInPasswordResult> | SignInPasswordResult;
  /** The two-factor step after a password. */
  onTwoFactor?: (values: TwoFactorValues & { email: string }) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Passkey as the second factor. */
  onTwoFactorPasskey?: () => void | Promise<unknown>;
  /** Sends a one-time sign-in link. */
  onMagicLink?: (email: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Seconds before a link or reset email can be sent again. Default 30. */
  resendSeconds?: number;
  /** Sends a reset email: adds "Forgot password?" which opens the request in place. */
  onForgotPassword?: (email: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Sends a one-time code to the email. */
  onRequestCode?: (email: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** The code step. */
  onCode?: (values: { email: string; code: string }) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** The SSO step: redirect to the organisation's identity provider. */
  onSso?: (email: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** The register step: go to sign-up with the email filled in. */
  onRegister?: (email: string) => void;
  oauthProviders?: OAuthProvider[];
  onOAuth?: (id: string) => void | Promise<unknown>;
  /** Shows "Sign in with a passkey" on the email step when the browser supports WebAuthn. */
  onPasskey?: () => void | Promise<unknown>;
  /** Passkey autofill (conditional UI) on the email field. */
  onPasskeyAutofill?: (signal: AbortSignal) => void | Promise<unknown>;
  /** Show "Keep me signed in" on the password step. Default true. */
  showRemember?: boolean;
  defaultEmail?: string;
  /** The method used last time: `"passkey"` or an OAuth provider id. */
  lastUsed?: string | null;
  /** Called on every step change, so the page can swap its title. */
  onStepChange?: (step: SignInStep, email: string) => void;
  labels?: Partial<SignInFlowLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  onIdentify: undefined,
  onPassword: undefined,
  onTwoFactor: undefined,
  onTwoFactorPasskey: undefined,
  onMagicLink: undefined,
  resendSeconds: 30,
  onForgotPassword: undefined,
  onRequestCode: undefined,
  onCode: undefined,
  onSso: undefined,
  onRegister: undefined,
  oauthProviders: undefined,
  onOAuth: undefined,
  onPasskey: undefined,
  onPasskeyAutofill: undefined,
  showRemember: true,
  defaultEmail: "",
  lastUsed: undefined,
  onStepChange: undefined,
  labels: undefined,
});
defineSlots<{ forgotPassword?: () => unknown }>();

const locale = useAuthLocale();
const t = computed<SignInFlowLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const step = ref<SignInStep>("email");
const next = ref<SignInNext | null>(null);
const twoFactor = ref<{ length?: number }>({});
const email = ref(props.defaultEmail);
const moved = ref(false);

function move(to: SignInStep, address = email.value) {
  moved.value = true;
  step.value = to;
  props.onStepChange?.(to, address);
}
function go(to: SignInNext | null, address = email.value) {
  next.value = to;
  move(to ? to.step : "email", address);
}
async function sendLink(address: string) {
  const failure = await props.onMagicLink?.(address);
  if (!failure || (!failure.error && !failure.fieldErrors)) go({ step: "link-sent" }, address);
  return failure;
}
const allowed = (alt: SignInAlternative) => next.value?.step !== "password" || !next.value.alternatives || next.value.alternatives.includes(alt);

// The step for an address when `onIdentify` is missing or resolves with nothing.
async function fallback(address: string): Promise<SignInNext | AuthSubmitResult> {
  if (props.onPassword || (!props.onRequestCode && !props.onMagicLink)) return { step: "password" };
  if (props.onRequestCode) return (await props.onRequestCode(address)) || { step: "code" };
  return (await props.onMagicLink?.(address)) || { step: "link-sent" };
}
async function useCode() {
  const failure = await props.onRequestCode?.(email.value);
  if (!failure) go({ step: "code" });
  return failure;
}
const hasForgot = computed(() => props.onForgotPassword);
</script>

<template>
  <div data-slot="sign-in-flow" :data-step="step" :data-moved="moved ? '' : undefined" :class="cn('flex w-full flex-col', props.class)">
    <!-- The key replays the entrance on every step, so a step change reads as a move forward, not a flicker. -->
    <div :key="step" data-slot="sign-in-flow-step" class="flex flex-col gap-4">
      <NqSignInFlowEmailStep
        v-if="step === 'email'"
        v-model:email="email"
        :t="t"
        :on-identify="props.onIdentify"
        :fallback="fallback"
        :oauth-providers="props.oauthProviders"
        :on-o-auth="props.onOAuth"
        :on-passkey="props.onPasskey"
        :on-passkey-autofill="props.onPasskeyAutofill"
        :last-used="props.lastUsed"
        @next="(n: SignInNext, address: string) => go(n, address)"
      />
      <div v-else-if="step === 'forgot'" data-slot="sign-in-flow-forgot" class="flex flex-col gap-4">
        <NqForgotPasswordForm :default-email="email" :resend-seconds="props.resendSeconds" :on-submit="(v) => props.onForgotPassword?.(v.email)" />
        <NqButton type="button" variant="ghost" size="lg" @click="move('password')">
          <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.backToSignIn }}
        </NqButton>
      </div>
      <template v-else>
        <NqSignInFlowIdentity :email="email" :change="t.change" @change="go(null)" />
        <NqSignInFlowPasswordStep
          v-if="step === 'password'"
          :t="t"
          :email="email"
          :on-password="props.onPassword"
          :show-remember="props.showRemember"
          :on-magic-link="props.onMagicLink && allowed('magic-link') ? () => sendLink(email) : undefined"
          :on-use-code="props.onRequestCode && allowed('code') ? useCode : undefined"
          @two-factor="
            (c) => {
              twoFactor = { length: c.length };
              move('two-factor');
            }
          "
        >
          <template v-if="$slots.forgotPassword || hasForgot" #forgotPassword>
            <slot name="forgotPassword">
              <NqButton type="button" variant="link" size="sm" data-slot="sign-in-flow-forgot-link" @click="move('forgot')">{{ t.forgotPassword }}</NqButton>
            </slot>
          </template>
        </NqSignInFlowPasswordStep>
        <NqVerifyOtpForm
          v-if="step === 'code'"
          :destination="email"
          channel="email"
          :length="next?.step === 'code' ? next.length : undefined"
          :on-submit="(v) => props.onCode?.({ email, code: v.code })"
          :on-resend="props.onRequestCode ? () => props.onRequestCode!(email) : undefined"
        />
        <NqTwoFactorChallenge v-if="step === 'two-factor'" :length="twoFactor.length" :on-passkey="props.onTwoFactorPasskey" :on-submit="(v) => props.onTwoFactor?.({ ...v, email })" />
        <NqSignInFlowLinkSent
          v-if="step === 'link-sent'"
          :t="t"
          :email="email"
          :seconds="props.resendSeconds"
          :on-resend="props.onMagicLink ? () => props.onMagicLink!(email) : undefined"
        />
        <div v-if="step === 'blocked'" data-slot="sign-in-flow-blocked" class="flex flex-col gap-4">
          <NqSignInFlowNotice :title="t.blockedTitle" :body="(next?.step === 'blocked' && next.message) || t.blockedBody">
            <template #icon><ShieldOff aria-hidden="true" /></template>
          </NqSignInFlowNotice>
          <NqButton type="button" variant="secondary" size="lg" @click="go(null)">{{ t.otherEmail }}</NqButton>
        </div>
        <NqSignInFlowSsoStep v-if="step === 'sso'" :t="t" :email="email" :connection="next?.step === 'sso' ? next.connection : undefined" :on-sso="props.onSso" />
        <div v-if="step === 'register'" data-slot="sign-in-flow-register" class="flex flex-col gap-4">
          <NqSignInFlowNotice :title="t.registerTitle" :body="t.registerBody">
            <template #icon><UserPlus aria-hidden="true" /></template>
          </NqSignInFlowNotice>
          <NqButton type="button" variant="primary" size="lg" @click="props.onRegister?.(email)">{{ t.register }}</NqButton>
          <NqButton type="button" variant="ghost" size="lg" @click="go(null)">{{ t.otherEmail }}</NqButton>
        </div>
      </template>
    </div>
  </div>
</template>
