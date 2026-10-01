<script setup lang="ts">
import { KeyRound, ShieldCheck } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle } from "../card";
import { NqCopyButton } from "../copy-button";
import { NqField, NqFieldLabel } from "../field";
import { NqOtpInput } from "../otp-input";
import { NqStatus } from "../status";
import { groupSecret, normalizeSecret, parseOtpAuthUri } from "./format";
import { TWO_FACTOR_STRINGS, type TwoFactorLabels, type TwoFactorResult } from "./labels";
import NqTwoFactorCredentialDialog from "./NqTwoFactorCredentialDialog.vue";
import NqTwoFactorQr from "./NqTwoFactorQr.vue";
import NqTwoFactorRecovery from "./NqTwoFactorRecovery.vue";

// Turn on TOTP two-factor authentication in three steps: scan the QR code (or type the key), confirm a 6-digit code, save
// the recovery codes. Once on, it shows the status with regenerate and disable. It is presentational: your callbacks talk
// to the server. The QR, key and codes stay left-to-right in Arabic.
interface Props {
  /** The `otpauth://totp/...` URI the QR code encodes. Your server creates it with a fresh secret. */
  otpauthUri: string;
  /** The base32 secret shown for manual entry. Default: read from `otpauthUri`. */
  secret?: string;
  /** Show the enabled state. Controlled; omit to let the component switch after the last step. */
  enabled?: boolean;
  /** Called with the 6-digit code. Resolve with `{ recoveryCodes }` on success (optional) or `{ error }` when the code is wrong. */
  onVerify: (code: string) => Promise<void | { error?: string; recoveryCodes?: readonly string[] }>;
  /** Recovery codes to show in step 3, when you already have them. Otherwise return them from `onVerify`. With none from either, step 3 is skipped and setup finishes after the code is verified. */
  recoveryCodes?: readonly string[];
  /** Called when the user finishes step 3 (after confirming they saved the codes). */
  onComplete?: () => void;
  /** Enabled state: how many recovery codes are unused. Fewer than 3 shows a warning. */
  recoveryCodesRemaining?: number;
  /** How to confirm dangerous actions (regenerate, disable). Default "password". */
  confirmWith?: "password" | "code";
  /** Enabled state: make a new set. Receives the password or code; resolve with the new codes or `{ error }`. */
  onRegenerateRecoveryCodes?: (credential: string) => Promise<readonly string[] | { error?: string }>;
  /** Enabled state: turn two-factor off. Receives the password or code. */
  onDisable?: (credential: string) => Promise<TwoFactorResult>;
  /** File name of the downloaded codes. Default "recovery-codes.txt". */
  downloadFilename?: string;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<TwoFactorLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  secret: undefined,
  enabled: undefined,
  recoveryCodes: undefined,
  onComplete: undefined,
  recoveryCodesRemaining: undefined,
  confirmWith: "password",
  onRegenerateRecoveryCodes: undefined,
  onDisable: undefined,
  downloadFilename: "recovery-codes.txt",
  labels: undefined,
});

const nasaq = useNasaq();
const t = computed<TwoFactorLabels>(() => ({ ...TWO_FACTOR_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));

const step = ref<1 | 2 | 3>(1);
const code = ref("");
const error = ref<string | null>(null);
const pending = ref(false);
const issued = ref<readonly string[]>([]);
const enabledState = ref(false);
const fresh = ref<readonly string[] | null>(null);
const dialog = ref<"regenerate" | "disable" | null>(null);

const enabled = computed(() => props.enabled ?? enabledState.value);
const key = computed(() => normalizeSecret(props.secret ?? parseOtpAuthUri(props.otpauthUri)?.secret ?? ""));
const codes = computed(() => props.recoveryCodes ?? issued.value);

function finish() {
  enabledState.value = true;
  step.value = 1;
  code.value = "";
  props.onComplete?.();
}

async function verify(value: string) {
  if (pending.value || value.length !== 6) return;
  pending.value = true;
  error.value = null;
  try {
    const result = (await props.onVerify(value)) ?? {};
    if (result.error) {
      error.value = result.error;
      return;
    }
    if (result.recoveryCodes?.length) issued.value = result.recoveryCodes;
    // Recovery codes are optional: with none to show, setup is done.
    if (!result.recoveryCodes?.length && !props.recoveryCodes?.length) {
      finish();
      return;
    }
    step.value = 3;
  } catch {
    error.value = t.value.genericError;
  } finally {
    pending.value = false;
  }
}

function onCodeInput(v: string) {
  code.value = v;
  error.value = null;
}

function back() {
  error.value = null;
  step.value = 1;
}

async function regenerate(credential: string) {
  const result = await props.onRegenerateRecoveryCodes!(credential);
  if (Array.isArray(result)) {
    fresh.value = result as readonly string[];
    return;
  }
  return result as { error?: string };
}

async function disable(credential: string) {
  const result = await props.onDisable!(credential);
  if (!result?.error) enabledState.value = false;
  return result;
}
</script>

<template>
  <NqCard data-slot="two-factor-setup" :data-state="enabled ? 'enabled' : `step-${step}`" :class="cn('w-full max-w-lg', props.class)">
    <template v-if="enabled">
      <NqCardHeader>
        <NqCardTitle as="h2">{{ t.enabledTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.enabledBody }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <NqStatus tone="success" :icon="ShieldCheck">{{ t.statusOn }}</NqStatus>
          <NqStatus v-if="props.recoveryCodesRemaining !== undefined" :tone="props.recoveryCodesRemaining < 3 ? 'warning' : 'neutral'" :icon="KeyRound">
            {{ t.remaining(props.recoveryCodesRemaining) }}
          </NqStatus>
        </div>
        <div v-if="fresh" class="flex flex-col gap-3">
          <p class="text-label text-foreground">{{ t.regenDone }}</p>
          <NqTwoFactorRecovery :codes="fresh" :t="t" :filename="props.downloadFilename" @confirm="fresh = null" />
        </div>
      </NqCardContent>
      <NqCardFooter v-if="!fresh" class="flex flex-wrap gap-2">
        <NqButton v-if="props.onRegenerateRecoveryCodes" type="button" @click="dialog = 'regenerate'">{{ t.regenerate }}</NqButton>
        <NqButton v-if="props.onDisable" type="button" variant="danger" @click="dialog = 'disable'">{{ t.disable }}</NqButton>
      </NqCardFooter>
      <NqTwoFactorCredentialDialog
        v-if="props.onRegenerateRecoveryCodes"
        :open="dialog === 'regenerate'"
        :title="t.regenTitle"
        :description="t.regenBody"
        :confirm-label="t.regenConfirm"
        :mode="props.confirmWith"
        :t="t"
        :on-submit="regenerate"
        @update:open="(o: boolean) => (dialog = o ? 'regenerate' : null)"
      />
      <NqTwoFactorCredentialDialog
        v-if="props.onDisable"
        :open="dialog === 'disable'"
        :title="t.disableTitle"
        :description="t.disableBody"
        :confirm-label="t.disableConfirm"
        danger
        :mode="props.confirmWith"
        :t="t"
        :on-submit="disable"
        @update:open="(o: boolean) => (dialog = o ? 'disable' : null)"
      />
    </template>
    <template v-else>
      <NqCardHeader>
        <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
        <NqCardDescription>{{ t.description }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <ol data-slot="two-factor-steps" class="flex gap-1.5">
          <li v-for="n in 3" :key="n" :aria-current="n === step ? 'step' : undefined" :class="cn('h-1 flex-1 rounded-full', n <= step ? 'bg-primary' : 'bg-secondary')">
            <span class="sr-only">{{ t.step(n, 3) }}</span>
          </li>
        </ol>
        <div v-if="step === 1" class="flex flex-col gap-4" data-slot="two-factor-scan">
          <div class="flex flex-col gap-1">
            <h3 class="text-label text-foreground">{{ t.scanTitle }}</h3>
            <p class="text-body-sm text-muted-foreground">{{ t.scanBody }}</p>
          </div>
          <NqTwoFactorQr :value="props.otpauthUri" :label="t.qrLabel" />
          <details v-if="key" class="rounded-control border border-border px-3 py-2">
            <summary class="cursor-pointer text-body-sm text-foreground">{{ t.cantScan }}</summary>
            <div class="mt-2 flex items-center gap-2" data-slot="two-factor-key">
              <code dir="ltr" :aria-label="t.keyLabel" class="min-w-0 flex-1 select-all break-all font-mono text-body tabular-nums text-foreground">{{ groupSecret(key) }}</code>
              <NqCopyButton :value="key" :label="t.copyKey" />
            </div>
          </details>
          <div>
            <NqButton type="button" variant="primary" @click="step = 2">{{ t.next }}</NqButton>
          </div>
        </div>
        <form v-if="step === 2" class="flex flex-col gap-4" data-slot="two-factor-verify" @submit.prevent="verify(code)">
          <div class="flex flex-col gap-1">
            <h3 class="text-label text-foreground">{{ t.verifyTitle }}</h3>
            <p class="text-body-sm text-muted-foreground">{{ t.verifyBody }}</p>
          </div>
          <NqField :invalid="error !== null" class="w-fit">
            <NqFieldLabel>{{ t.codeLabel }}</NqFieldLabel>
            <NqOtpInput
              name="code"
              auto-focus
              :model-value="code"
              :invalid="error !== null"
              :disabled="pending"
              :get-box-label="t.boxLabel"
              @update:model-value="onCodeInput"
              @complete="verify"
            />
            <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
          </NqField>
          <div class="flex flex-wrap gap-2">
            <NqButton type="button" variant="ghost" :disabled="pending" @click="back">{{ t.back }}</NqButton>
            <NqButton type="submit" variant="primary" :loading="pending" :disabled="code.length !== 6">{{ t.verify }}</NqButton>
          </div>
        </form>
        <div v-if="step === 3" class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <h3 class="text-label text-foreground">{{ t.recoveryTitle }}</h3>
            <p class="text-body-sm text-muted-foreground">{{ t.recoveryBody }}</p>
          </div>
          <NqTwoFactorRecovery v-if="codes.length" :codes="codes" :t="t" :filename="props.downloadFilename" @confirm="finish" />
          <NqAlert v-else tone="warning">{{ t.genericError }}</NqAlert>
        </div>
      </NqCardContent>
    </template>
  </NqCard>
</template>
