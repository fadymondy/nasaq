<script setup lang="ts">
import { Check, ExternalLink, RefreshCw } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton, buttonVariants } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqStatus } from "../status";
import { CHROME_EXTENSION_STRINGS, type ChromeExtensionInstallLabels } from "./strings";

// The install flow for a Chrome extension: add it from the Web Store, pin it, sign in. Presentational: you tell
// it what was detected. Pinning cannot be detected, so the person confirms it (v-model:pinned or defaultPinned).
// The `store-button` slot replaces the store button content.
interface Props {
  /** The extension's Chrome Web Store page. */
  storeUrl: string;
  /** Whether the page found the extension. */
  installed: boolean;
  version?: string;
  signedIn?: boolean;
  /** Controlled pinned state (v-model:pinned). */
  pinned?: boolean;
  defaultPinned?: boolean;
  /** Look for the extension again. Resolve when the check finishes; the host then updates `installed`. */
  onCheck?: () => Promise<void>;
  /** Start sign-in. Resolve `{ error }` to show it. */
  onSignIn?: () => Promise<void | { error?: string }>;
  /** False in Firefox, Safari and other browsers that cannot install it: shows a notice. Default true. */
  supported?: boolean;
  labels?: Partial<ChromeExtensionInstallLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  version: undefined,
  signedIn: false,
  pinned: undefined,
  defaultPinned: false,
  onCheck: undefined,
  onSignIn: undefined,
  supported: true,
  labels: undefined,
});
const emit = defineEmits<{ "update:pinned": [pinned: boolean] }>();

const nq = useNasaq();
const t = computed(() => ({ ...CHROME_EXTENSION_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const pinState = ref(props.defaultPinned);
const pinned = computed(() => props.pinned ?? pinState.value);
const checking = ref(false);
const signing = ref(false);
const error = ref<string | null>(null);

type StepState = "done" | "current" | "todo";
const flags = computed(() => [props.installed, props.installed && pinned.value, props.installed && props.signedIn]);
const current = computed(() => flags.value.findIndex((d) => !d));
const allDone = computed(() => flags.value.every(Boolean));
const state = (i: number): StepState => (flags.value[i] ? "done" : i === current.value ? "current" : "todo");
const stateText = computed(() => ({ done: t.value.stateDone, current: t.value.stateCurrent, todo: t.value.stateTodo }));

function setPinned(next: boolean) {
  pinState.value = next;
  emit("update:pinned", next);
}
async function check() {
  if (!props.onCheck || checking.value) return;
  checking.value = true;
  try {
    await props.onCheck();
  } finally {
    checking.value = false;
  }
}
async function signIn() {
  if (!props.onSignIn || signing.value) return;
  signing.value = true;
  error.value = null;
  try {
    const result = await props.onSignIn();
    if (result?.error) error.value = result.error;
  } catch {
    error.value = t.value.signInFailed;
  } finally {
    signing.value = false;
  }
}

const steps = computed(() => [
  { title: t.value.stepAdd, body: t.value.stepAddBody },
  { title: t.value.stepPin, body: t.value.stepPinBody },
  { title: t.value.stepSignIn, body: t.value.stepSignInBody },
]);
</script>

<template>
  <NqCard data-slot="chrome-extension-install" :data-state="allDone ? 'ready' : props.installed ? 'installed' : 'missing'" :class="cn('w-full max-w-2xl', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-5">
      <NqAlert v-if="!props.supported" tone="warning">{{ t.unsupported }}</NqAlert>
      <div class="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-secondary px-3 py-2" data-slot="extension-detected" role="status">
        <NqStatus :tone="props.installed ? 'success' : 'neutral'">{{ props.installed ? t.detected(props.version) : t.notDetected }}</NqStatus>
        <NqButton v-if="props.onCheck && !props.installed" type="button" size="sm" variant="ghost" :loading="checking" @click="check">
          <RefreshCw aria-hidden="true" />
          {{ checking ? t.checking : t.check }}
        </NqButton>
      </div>
      <ol :aria-label="t.steps" class="flex flex-col gap-0">
        <li
          v-for="(step, i) in steps"
          :key="step.title"
          data-slot="extension-step"
          :data-state="state(i)"
          :aria-current="state(i) === 'current' ? 'step' : undefined"
          class="relative flex gap-3 pb-5 last:pb-0"
        >
          <span v-if="i < steps.length - 1" aria-hidden="true" class="absolute inset-y-7 start-[13px] w-px bg-border" />
          <span
            aria-hidden="true"
            :class="
              cn(
                'z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption tabular-nums',
                state(i) === 'done' && 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
                state(i) === 'current' && 'border-primary bg-primary text-primary-foreground',
                state(i) === 'todo' && 'border-border bg-card text-muted-foreground',
              )
            "
          >
            <Check v-if="state(i) === 'done'" class="size-4" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <p :class="cn('text-label', state(i) === 'todo' ? 'text-muted-foreground' : 'text-foreground')">
              <span class="sr-only">{{ t.stepLabel(i + 1, steps.length, stateText[state(i)]) }}: </span>
              {{ step.title }}
            </p>
            <p v-if="state(i) !== 'done'" class="text-body-sm text-muted-foreground">{{ step.body }}</p>
            <NqStatus v-if="state(i) === 'done' && i === 2" tone="success">{{ t.signedIn }}</NqStatus>
            <div v-if="state(i) === 'current' || (i === 1 && props.installed) || (i === 2 && props.installed && !props.signedIn)" class="flex flex-wrap items-center gap-2 pt-0.5">
              <template v-if="i === 0">
                <a :href="props.storeUrl" target="_blank" rel="noreferrer" data-slot="extension-store-link" :class="buttonVariants({ variant: 'primary', size: 'sm' })">
                  <slot name="store-button">
                    {{ t.addButton }}
                    <ExternalLink aria-hidden="true" />
                  </slot>
                </a>
              </template>
              <template v-else-if="i === 1">
                <NqButton v-if="pinned" type="button" size="sm" variant="ghost" @click="setPinned(false)">{{ t.unpin }}</NqButton>
                <NqButton v-else type="button" size="sm" variant="primary" :disabled="!props.installed" @click="setPinned(true)">{{ t.pinnedButton }}</NqButton>
              </template>
              <template v-else>
                <NqButton v-if="!props.signedIn" type="button" size="sm" variant="primary" :disabled="!props.installed || !props.onSignIn" :loading="signing" @click="signIn">{{ t.signInButton }}</NqButton>
              </template>
            </div>
            <p v-if="state(i) === 'todo' && !props.installed && i > 0" class="text-caption text-muted-foreground">{{ t.blocked }}</p>
            <p v-if="i === 2 && error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
          </div>
        </li>
      </ol>
      <NqAlert v-if="allDone" tone="success" :title="t.ready">{{ t.readyBody }}</NqAlert>
    </NqCardContent>
  </NqCard>
</template>
