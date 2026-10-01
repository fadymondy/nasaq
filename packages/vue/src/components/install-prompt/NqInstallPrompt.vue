<script setup lang="ts">
import { CircleCheck, Download, Share, SquarePlus } from "lucide-vue-next";
import { computed, ref } from "vue";
import NqButton from "../button/NqButton.vue";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import NqProductMark from "../product-mark/NqProductMark.vue";
import type { InstallPlatform } from "./install-prompt-platform";
import type { InstallPromptLabels } from "./strings";
import { fill, useInstallPromptLabels } from "./use-labels";

// The dialog that asks someone to install the web app. It explains the benefit before the browser's own prompt, walks
// iPhone and iPad through Share, then Add to Home Screen, and confirms when the app is installed. It is controlled
// (v-model:open): you decide when to open it (after a useful moment, not on first load) and remember "Not now".
// The `icon` slot replaces the provider brand mark.
interface Props {
  open: boolean;
  /** Which path to show. From `useInstallPrompt()`. */
  platform: InstallPlatform;
  /** The app's name, in the title. */
  appName: string;
  /** Replaces the three default benefit lines. */
  benefits?: readonly string[];
  /** Opens the browser's install dialog. From `useInstallPrompt().install`. */
  onInstall?: () => void | Promise<unknown>;
  /** "Not now": remember it, for example with `nextAskAt`. Closes the dialog. */
  onDismiss?: () => void;
  labels?: Partial<InstallPromptLabels>;
}
const props = withDefaults(defineProps<Props>(), { benefits: undefined, onInstall: undefined, onDismiss: undefined, labels: undefined });
const emit = defineEmits<{ "update:open": [value: boolean] }>();
const t = useInstallPromptLabels(() => props.labels);
const busy = ref(false);
const lines = computed(() => props.benefits ?? [t.value.benefitFast, t.value.benefitOffline, t.value.benefitAlerts]);
const steps = computed(() => [
  { icon: Share, text: t.value.iosStep1 },
  { icon: SquarePlus, text: t.value.iosStep2 },
]);
const close = () => emit("update:open", false);
function notNow() {
  props.onDismiss?.();
  close();
}
async function install() {
  busy.value = true;
  try {
    await props.onInstall?.();
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(v: boolean) => emit('update:open', v)">
    <NqDialogContent data-slot="install-prompt" :data-platform="props.platform" class="max-w-md">
      <template v-if="props.platform === 'installed'">
        <NqDialogHeader class="items-center text-center">
          <span aria-hidden="true" class="mb-1 inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
            <CircleCheck class="size-6" />
          </span>
          <NqDialogTitle>{{ fill(t.installedTitle, { app: props.appName }) }}</NqDialogTitle>
          <NqDialogDescription>{{ t.installedBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqDialogFooter>
          <NqButton variant="primary" @click="close">{{ t.done }}</NqButton>
        </NqDialogFooter>
      </template>
      <template v-else>
        <NqDialogHeader>
          <span class="mb-1 inline-flex size-12 items-center justify-center overflow-hidden rounded-card border border-border bg-card">
            <slot name="icon"><NqProductMark :size="28" title="" /></slot>
          </span>
          <NqDialogTitle>{{ fill(t.title, { app: props.appName }) }}</NqDialogTitle>
          <NqDialogDescription>{{ props.platform === "unsupported" ? t.unsupportedBody : props.platform === "ios" ? t.iosIntro : t.description }}</NqDialogDescription>
        </NqDialogHeader>
        <ul v-if="props.platform === 'prompt'" class="flex flex-col gap-2 text-body-sm text-nq-fg-body">
          <li v-for="line in lines" :key="line" class="flex items-center gap-2">
            <CircleCheck aria-hidden="true" class="size-4 shrink-0 text-nq-success-text" />
            {{ line }}
          </li>
        </ul>
        <ol v-if="props.platform === 'ios'" class="flex flex-col gap-2">
          <li v-for="(step, i) in steps" :key="i" class="flex items-center gap-3 rounded-control border border-border bg-card p-3 text-body-sm">
            <span aria-hidden="true" class="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-secondary">
              <component :is="step.icon" class="size-4" />
            </span>
            <span>
              <bdi class="me-1 text-muted-foreground tabular-nums">{{ i + 1 }}.</bdi>
              {{ step.text }}
            </span>
          </li>
        </ol>
        <NqDialogFooter>
          <NqButton variant="ghost" @click="notNow">{{ t.later }}</NqButton>
          <NqButton v-if="props.platform === 'prompt'" variant="primary" :loading="busy" @click="install">
            <Download aria-hidden="true" />
            {{ t.install }}
          </NqButton>
          <NqButton v-else variant="primary" @click="close">{{ t.done }}</NqButton>
        </NqDialogFooter>
      </template>
    </NqDialogContent>
  </NqDialog>
</template>
