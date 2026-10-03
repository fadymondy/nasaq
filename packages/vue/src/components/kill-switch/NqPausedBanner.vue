<script setup lang="ts">
import { CirclePause } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqDateTime } from "../numeric";
import { strings, type KillSwitchLabels } from "./strings";
import type { KillSwitchResult, PauseInfo } from "./types";

// The bar that tells everyone the emergency stop is on. Put it above every page while `paused` is set.
// It is a `role="status"` region, so it is announced when it appears, and it stays pinned.
interface Props {
  paused: PauseInfo;
  /** Shows a Resume button. Omit for people who cannot resume. */
  onResume?: () => Promise<KillSwitchResult>;
  /** Pin to the top of the scroll container. Default true. */
  sticky?: boolean;
  /** Replaces the hint text (also the `hint` slot). */
  hint?: string;
  labels?: KillSwitchLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { sticky: true, onResume: undefined, hint: undefined, labels: undefined });

const nq = useNasaq();
const t = computed(() => ({ ...strings(nq.locale.value), ...props.labels }));
const busy = ref(false);
const error = ref<string | null>(null);
let mounted = true;
onBeforeUnmount(() => (mounted = false));

async function resume() {
  if (!props.onResume || busy.value) return;
  busy.value = true;
  error.value = null;
  let message: string | null = null;
  try {
    const r = await props.onResume();
    if (r && typeof r === "object" && r.error) message = r.error;
  } catch {
    message = t.value.failed;
  }
  if (mounted) {
    busy.value = false;
    error.value = message;
  }
}
</script>

<template>
  <div
    role="status"
    data-slot="paused-banner"
    :class="cn('flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 bg-nq-danger-soft px-4 py-2 text-body-sm text-nq-danger-text', props.sticky && 'sticky top-0 z-40', props.class)"
  >
    <CirclePause aria-hidden="true" class="size-4 shrink-0" />
    <span class="min-w-0 flex-1">
      <span class="font-medium">{{ t.bannerTitle }}.</span> <span class="opacity-80"><slot name="hint">{{ props.hint ?? t.bannerHint }}</slot></span>{{ " " }}
      <span class="opacity-80">{{ t.pausedBy(props.paused.by) }}, <NqDateTime :value="props.paused.at" relative />. {{ props.paused.reason }}</span>
      <span v-if="error" role="alert" class="ms-2 font-medium">{{ error }}</span>
    </span>
    <NqButton v-if="props.onResume" size="sm" variant="secondary" :loading="busy" @click="resume">{{ busy ? t.bannerResuming : t.bannerResume }}</NqButton>
  </div>
</template>
