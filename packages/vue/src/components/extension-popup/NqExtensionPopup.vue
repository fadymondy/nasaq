<script setup lang="ts">
import { Pause, Play, Settings } from "lucide-vue-next";
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqSwitch } from "../switch";
import { useExtensionStrings, type ExtensionPopupLabels, type ExtensionStatus } from "./strings";

// The frame of a browser extension popup: 22rem wide, a header with the brand, a status badge and a pause switch,
// a scrolling body and a footer with the options link.
interface Props {
  status?: ExtensionStatus;
  /** Shows the pause switch when `onPausedChange` is given. */
  paused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  onOpenOptions?: () => void;
  labels?: ExtensionPopupLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { status: "connected", paused: undefined, onPausedChange: undefined, onOpenOptions: undefined, labels: undefined });
const slots = defineSlots<{
  /** The product mark and name. Keep the Latin name `dir="ltr"` so it does not reorder in Arabic. */
  brand?: () => unknown;
  default?: () => unknown;
  /** Version text or any footer content, at the inline end of the footer. */
  footer?: () => unknown;
}>();
const { t } = useExtensionStrings(() => props.labels);
const state = computed<"paused" | ExtensionStatus>(() => (props.paused ? "paused" : props.status));
const tone = { connected: "success", disconnected: "neutral", error: "danger", paused: "warning" } as const;
const id = `nq-ext-pause-${useId()}`;
</script>

<template>
  <div
    data-slot="extension-popup"
    :data-state="state"
    :class="cn('flex max-h-[37.5rem] w-[22rem] max-w-full flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-lg', props.class)"
  >
    <header class="flex items-center gap-2 border-b border-border px-3 py-2.5">
      <span class="flex min-w-0 flex-1 items-center gap-2 text-label font-semibold"><slot name="brand" /></span>
      <NqBadge :variant="tone[state]">{{ t[state] }}</NqBadge>
      <span v-if="props.onPausedChange" class="flex items-center gap-1.5">
        <label :for="id" class="sr-only">{{ t.pause }}</label>
        <Pause v-if="props.paused" aria-hidden="true" class="size-3.5 text-nq-warning-text" />
        <Play v-else aria-hidden="true" class="size-3.5 text-muted-foreground" />
        <NqSwitch :id="id" :model-value="!!props.paused" :aria-label="t.pause" :title="t.pauseHint" @update:model-value="props.onPausedChange" />
      </span>
    </header>
    <div data-slot="extension-popup-body" class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <slot />
    </div>
    <footer v-if="props.onOpenOptions || slots.footer" class="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-caption text-muted-foreground">
      <NqButton v-if="props.onOpenOptions" variant="ghost" size="sm" @click="props.onOpenOptions">
        <Settings aria-hidden="true" />
        {{ t.options }}
      </NqButton>
      <span v-else />
      <span><slot name="footer" /></span>
    </footer>
  </div>
</template>
