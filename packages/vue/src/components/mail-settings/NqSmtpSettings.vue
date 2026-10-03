<script setup lang="ts">
import { Check, CircleDashed, Send, X } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqCodeBlock } from "../code-block";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqStatus, type StatusTone } from "../status";
import { defaultSmtpPort, isEmail, SMTP_ENCRYPTIONS, stepStates, TEST_STEPS, validateSmtp, type SmtpEncryption, type StepState, type TestOutcome } from "./mail-format";
import { STRINGS, type MailSettingsLabels } from "./strings";
import type { MailResult, SmtpConfig, SmtpSaveInput, SmtpTestInput } from "./types";

// SMTP settings: host, port, encryption, username, a write-only password and the From identity, plus a test send that shows
// each of the four steps (connect, secure, sign in, send) as passed, failed or skipped with the server reply for a failure.
// The password is never read back: an empty field keeps the stored one.
interface Props {
  /** The saved settings. A new object resets the form to it. */
  value: SmtpConfig;
  /** Saves the form. Return `{ error }` to show a failure. */
  onSave: (input: SmtpSaveInput) => Promise<MailResult> | MailResult;
  /** Sends a test message with the current form values and reports each step. */
  onTest: (input: SmtpTestInput) => Promise<TestOutcome>;
  /** Pre-fills the test recipient, for example the signed-in user. */
  defaultTestTo?: string;
  loading?: boolean;
  /** Override any built-in English or Arabic string. */
  labels?: Partial<MailSettingsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { defaultTestTo: "", loading: false, labels: undefined });

const nq = useNasaq();
const t = computed<MailSettingsLabels>(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));

const host = ref(props.value.host);
const port = ref(String(props.value.port));
const encryption = ref<SmtpEncryption>(props.value.encryption);
const username = ref(props.value.username);
const password = ref("");
const fromName = ref(props.value.fromName);
const fromAddress = ref(props.value.fromAddress);
const touched = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const saved = ref(false);
const to = ref(props.defaultTestTo);
const toTouched = ref(false);
const testing = ref(false);
const outcome = ref<TestOutcome | null>(null);
const testError = ref<string | null>(null);

// A new saved value from the host resets the form to it.
watch(
  () => props.value,
  (value) => {
    host.value = value.host;
    port.value = String(value.port);
    encryption.value = value.encryption;
    username.value = value.username;
    fromName.value = value.fromName;
    fromAddress.value = value.fromAddress;
    password.value = "";
  },
);

const invalid = computed(() => validateSmtp({ host: host.value, port: port.value, encryption: encryption.value, username: username.value, fromName: fromName.value, fromAddress: fromAddress.value }));
const draft = (): SmtpSaveInput => ({
  host: host.value.trim(),
  port: Number(port.value),
  encryption: encryption.value,
  username: username.value.trim(),
  ...(password.value ? { password: password.value } : {}),
  fromName: fromName.value.trim(),
  fromAddress: fromAddress.value.trim(),
});

const encItems = computed(() => SMTP_ENCRYPTIONS.map((e) => ({ value: e, label: t.value.encryptions[e] })));

function setEncryption(v: unknown) {
  if (!v) return;
  const next = v as SmtpEncryption;
  // Keep the port in step with the mode unless the user typed a custom one.
  if (port.value === String(defaultSmtpPort(encryption.value))) port.value = String(defaultSmtpPort(next));
  encryption.value = next;
}

async function save() {
  touched.value = true;
  saved.value = false;
  if (invalid.value.length) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await props.onSave(draft());
    if (result && result.error) error.value = result.error;
    else {
      saved.value = true;
      password.value = "";
    }
  } catch {
    error.value = t.value.genericError;
  } finally {
    saving.value = false;
  }
}

async function sendTest() {
  toTouched.value = true;
  touched.value = true;
  if (!isEmail(to.value) || invalid.value.length) return;
  testing.value = true;
  outcome.value = null;
  testError.value = null;
  try {
    outcome.value = await props.onTest({ ...draft(), to: to.value.trim() });
  } catch {
    testError.value = t.value.genericError;
  } finally {
    testing.value = false;
  }
}

const stepTone: Record<StepState, StatusTone> = { pass: "success", fail: "danger", skipped: "neutral" };
const states = computed(() => (outcome.value ? stepStates(outcome.value.steps) : null));
const failing = computed(() => outcome.value?.steps.find((s) => !s.ok));
</script>

<template>
  <div data-slot="smtp-settings" :aria-busy="props.loading || undefined" :class="cn('flex w-full flex-col gap-6', props.class)">
    <NqCard class="w-full">
      <NqCardHeader>
        <NqCardTitle as="h2">{{ t.smtpTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.smtpDescription }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent>
        <form novalidate class="flex flex-col gap-4" @submit.prevent="save">
          <NqAlert v-if="error" tone="danger" dismissible :dismiss-label="t.dismiss" @dismiss="error = null">{{ error }}</NqAlert>
          <NqAlert v-if="saved" tone="success" dismissible :dismiss-label="t.dismiss" @dismiss="saved = false">{{ t.saved }}</NqAlert>
          <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_12rem]">
            <NqField :invalid="touched && invalid.includes('host')">
              <NqFieldLabel>{{ t.host }}</NqFieldLabel>
              <NqInput v-model="host" ltr :placeholder="t.hostPlaceholder" autocomplete="off" :spellcheck="false" :disabled="props.loading" />
              <NqFieldError v-if="touched && invalid.includes('host')" match>{{ t.hostInvalid }}</NqFieldError>
            </NqField>
            <NqField :invalid="touched && invalid.includes('port')">
              <NqFieldLabel>{{ t.port }}</NqFieldLabel>
              <NqInput v-model="port" ltr inputmode="numeric" autocomplete="off" :disabled="props.loading" />
              <NqFieldError v-if="touched && invalid.includes('port')" match>{{ t.portInvalid }}</NqFieldError>
            </NqField>
            <NqField>
              <NqFieldLabel>{{ t.encryption }}</NqFieldLabel>
              <NqSelect :model-value="encryption" @update:model-value="setEncryption">
                <NqSelectTrigger :disabled="props.loading"><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="o in encItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
              <NqFieldDescription>{{ t.encryptionHint(defaultSmtpPort(encryption)) }}</NqFieldDescription>
            </NqField>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <NqField>
              <NqFieldLabel>{{ t.username }}</NqFieldLabel>
              <NqInput v-model="username" ltr autocomplete="off" :spellcheck="false" :disabled="props.loading" />
            </NqField>
            <NqField>
              <NqFieldLabel>{{ t.password }}</NqFieldLabel>
              <NqInput v-model="password" ltr type="password" autocomplete="new-password" :placeholder="props.value.passwordSet ? t.passwordPlaceholderSaved : ''" :disabled="props.loading" />
              <NqFieldDescription>{{ props.value.passwordSet ? t.passwordSaved : t.passwordHint }}</NqFieldDescription>
            </NqField>
            <NqField>
              <NqFieldLabel>{{ t.fromName }}</NqFieldLabel>
              <NqInput v-model="fromName" :placeholder="t.fromNamePlaceholder" autocomplete="off" :disabled="props.loading" />
            </NqField>
            <NqField :invalid="touched && invalid.includes('fromAddress')">
              <NqFieldLabel>{{ t.fromAddress }}</NqFieldLabel>
              <NqInput v-model="fromAddress" ltr type="email" :placeholder="t.fromAddressPlaceholder" autocomplete="off" :disabled="props.loading" />
              <NqFieldError v-if="touched && invalid.includes('fromAddress')" match>{{ t.fromAddressInvalid }}</NqFieldError>
            </NqField>
          </div>
          <div class="flex justify-end">
            <NqButton type="submit" variant="primary" :loading="saving" :disabled="props.loading">{{ t.save }}</NqButton>
          </div>
        </form>
      </NqCardContent>
    </NqCard>

    <NqCard data-slot="smtp-test" class="w-full">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.testTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.testDescription }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <NqField class="flex-1" :invalid="toTouched && !isEmail(to)">
            <NqFieldLabel>{{ t.testTo }}</NqFieldLabel>
            <NqInput v-model="to" ltr type="email" :placeholder="t.testToPlaceholder" autocomplete="off" :disabled="props.loading" />
            <NqFieldError v-if="toTouched && !isEmail(to)" match>{{ t.testToInvalid }}</NqFieldError>
          </NqField>
          <NqButton type="button" variant="secondary" :loading="testing" :disabled="props.loading" @click="sendTest">
            <Send aria-hidden="true" class="size-4 rtl:-scale-x-100" />
            {{ testing ? t.testing : t.sendTest }}
          </NqButton>
        </div>
        <NqAlert v-if="testError" tone="danger">{{ testError }}</NqAlert>
        <div v-if="outcome && states" data-slot="smtp-test-result" class="flex flex-col gap-3" role="status">
          <NqAlert :tone="outcome.ok ? 'success' : 'danger'">{{ outcome.ok ? t.testPassed : t.testFailed }}</NqAlert>
          <ol class="flex flex-col divide-y divide-border rounded-control border border-border">
            <li v-for="id in TEST_STEPS" :key="id" class="flex items-center justify-between gap-3 px-3 py-2 text-body-sm">
              <span class="flex items-center gap-2 text-foreground">
                <Check v-if="states[id] === 'pass'" aria-hidden="true" class="size-4 text-success" />
                <X v-else-if="states[id] === 'fail'" aria-hidden="true" class="size-4 text-danger" />
                <CircleDashed v-else aria-hidden="true" class="size-4 text-muted-foreground" />
                {{ t.steps[id] }}
              </span>
              <NqStatus :tone="stepTone[states[id]]">{{ t.stepState[states[id]] }}</NqStatus>
            </li>
          </ol>
          <NqCodeBlock v-if="failing?.message" :code="failing.message" language="text" />
        </div>
      </NqCardContent>
    </NqCard>
  </div>
</template>
