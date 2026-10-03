<script setup lang="ts">
import { ExternalLink, Laptop, Smartphone } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useAuthLocale } from "../auth-layout";
import { NqButton, buttonVariants } from "../button";
import { NqCard } from "../card";
import { NqCopyButton } from "../copy-button";
import { NqProductMark } from "../product-mark";
import { NqSpinner } from "../spinner";
import { formatUserCode } from "./device-code";
import { STRINGS, type DevicePairingLabels, type HandoffState } from "./strings";

// The page a browser shows after sign-in to hand the session to a native app: an "Open the app" link to the deep link, a state
// line, a browser fallback and a typed-code fallback. It never navigates on its own.
interface Props {
  /** The app's name, e.g. "Mahaam Desktop". */
  appName: string;
  /** The deep link that opens the app: `mahaam://auth/callback?token=…`. */
  href: string;
  /** `opening` while the browser is handing over; `opened` after; `failed` when the app did not answer. Default `opening`. */
  state?: HandoffState;
  /** Called when the person presses Open or Try again. */
  onOpen?: () => void;
  /** Sign in on the web instead. */
  browserHref?: string;
  /** A fallback code to type into the app when links cannot open it. */
  fallbackCode?: string;
  onCancel?: () => void;
  labels?: Partial<DevicePairingLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { state: "opening", onOpen: undefined, browserHref: undefined, fallbackCode: undefined, onCancel: undefined, labels: undefined });
defineSlots<{
  /** The app's official mark. Default: the product mark. */
  mark?: () => unknown;
}>();
const locale = useAuthLocale();
const t = computed<DevicePairingLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
const message = computed(() => (props.state === "opening" ? t.value.handoffOpening : props.state === "opened" ? t.value.handoffOpened : t.value.handoffFailed));
const linkClass = computed(() => cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full sm:w-auto"));
</script>

<template>
  <NqCard data-slot="device-handoff" :data-state="state" :class="cn('mx-auto w-full max-w-md items-center gap-5 p-8 text-center', props.class)">
    <div class="flex items-center gap-3 text-muted-foreground" aria-hidden="true">
      <Laptop class="size-5" />
      <span class="h-px w-8 bg-border" />
      <Smartphone class="size-5" />
    </div>
    <div data-slot="device-handoff-mark"><slot name="mark"><NqProductMark :size="44" title="" /></slot></div>
    <h1 class="text-h2 text-foreground">{{ fill(t.handoffTitle, { app: appName }) }}</h1>
    <div :role="state === 'failed' ? 'alert' : 'status'" class="flex items-center gap-2 text-body-sm text-muted-foreground">
      <NqSpinner v-if="state === 'opening'" />
      <p>{{ fill(message, { app: appName }) }}</p>
    </div>
    <a :href="href" :class="linkClass" @click="onOpen?.()">
      <ExternalLink aria-hidden="true" class="rtl:-scale-x-100" />
      {{ fill(state === "failed" || state === "opened" ? t.handoffAgain : t.handoffOpen, { app: appName }) }}
    </a>
    <a v-if="browserHref" :href="browserHref" class="text-body-sm text-foreground underline underline-offset-4">{{ t.handoffBrowser }}</a>
    <div v-if="fallbackCode" class="flex w-full flex-col items-center gap-1.5 border-t border-border pt-4">
      <span class="text-caption text-muted-foreground">{{ t.handoffCode }}</span>
      <span class="inline-flex items-center gap-1">
        <span dir="ltr" class="font-mono text-h3 tracking-[0.12em] text-foreground">{{ formatUserCode(fallbackCode) }}</span>
        <NqCopyButton :value="formatUserCode(fallbackCode)" />
      </span>
    </div>
    <NqButton v-if="onCancel" variant="link" size="sm" @click="onCancel()">{{ t.handoffCancel }}</NqButton>
  </NqCard>
</template>
