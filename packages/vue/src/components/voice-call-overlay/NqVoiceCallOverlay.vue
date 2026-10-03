<script setup lang="ts">
import { Bot, Captions, Mic, MicOff, PhoneOff, TriangleAlert } from "lucide-vue-next";
import { computed, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAiThinking } from "../ai-states";
import { NqButton } from "../button";
import { NqSpinner } from "../spinner";
import NqVoiceVisualizer from "./NqVoiceVisualizer.vue";
import { voiceCallWords, type VoiceCallLabelOverrides } from "./labels";
import type { VoiceAgent, VoiceCaption } from "./types";
import { formatCallTime, type VoiceCallState } from "./voice-call-math";

// A full-screen voice call with an AI agent: who you are talking to, how long, a voice visualiser, what state the agent is in (listening, thinking,
// speaking), live captions, and mute, captions and hang-up controls. It holds no audio. You connect the call, feed `state` and `level`, and act on
// `onEnd` and v-model:muted.
const props = withDefaults(
  defineProps<{
    state: VoiceCallState;
    agent: VoiceAgent;
    /** Loudness of the current speaker, 0 to 1. */
    level?: number;
    /** v-model:muted, the microphone mute. */
    muted?: boolean;
    /** Hang up. */
    onEnd: () => void | Promise<void>;
    /** Seconds since the call was answered. */
    elapsed?: number;
    /** The last lines of the conversation. Only the last `captionLines` are shown. */
    captions?: readonly VoiceCaption[];
    captionLines?: number;
    /** v-model:showCaptions, captions shown or hidden. */
    showCaptions?: boolean;
    defaultShowCaptions?: boolean;
    /** Cut in while the agent is speaking. Adds a button in that state. */
    onInterrupt?: () => void;
    /** Shown with the `error` state, with a Reconnect button when `onRetry` is set. */
    error?: string;
    onRetry?: () => void;
    /** Render inside the nearest positioned parent instead of covering the whole window. For embedding and stories. */
    contained?: boolean;
    labels?: VoiceCallLabelOverrides;
    class?: HTMLAttributes["class"];
  }>(),
  {
    level: undefined,
    muted: false,
    elapsed: undefined,
    captions: () => [],
    captionLines: 3,
    showCaptions: undefined,
    defaultShowCaptions: true,
    onInterrupt: undefined,
    error: undefined,
    onRetry: undefined,
    contained: false,
    labels: undefined,
  },
);
const emit = defineEmits<{ "update:muted": [muted: boolean]; "update:showCaptions": [show: boolean] }>();

const nq = useNasaq();
const t = computed(() => voiceCallWords(nq.locale.value, props.labels));
const innerShow = ref(props.defaultShowCaptions);
const show = computed(() => props.showCaptions ?? innerShow.value);
const ending = ref(false);
const rootEl = ref<HTMLDivElement | null>(null);
const lines = computed(() => props.captions.slice(-props.captionLines));
const image = computed(() => props.agent.avatar?.startsWith("http") || props.agent.avatar?.startsWith("/") || props.agent.avatar?.startsWith("data:"));
const stateText = computed(() => (props.state === "listening" && props.muted ? t.value.muted : t.value.states[props.state]));

onMounted(() => {
  if (!props.contained) rootEl.value?.focus();
});

async function end() {
  if (ending.value) return;
  ending.value = true;
  try {
    await props.onEnd();
  } finally {
    ending.value = false;
  }
}
function toggleCaptions() {
  innerShow.value = !show.value;
  emit("update:showCaptions", innerShow.value);
}
</script>

<template>
  <div
    ref="rootEl"
    data-slot="voice-call-overlay"
    :data-state="props.state"
    role="dialog"
    :aria-modal="props.contained ? undefined : true"
    :aria-label="`${t.label}: ${props.agent.name}`"
    tabindex="-1"
    :class="cn('z-50 flex flex-col bg-background text-foreground outline-none', props.contained ? 'absolute inset-0' : 'fixed inset-0', props.class)"
  >
    <header class="flex items-center gap-3 px-5 py-4">
      <span
        aria-hidden="true"
        :class="cn('inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-body', props.state === 'speaking' ? 'border-nq-accent' : 'border-border')"
      >
        <img v-if="image" :src="props.agent.avatar" alt="" class="size-full object-cover" />
        <template v-else-if="props.agent.avatar">{{ props.agent.avatar }}</template>
        <Bot v-else class="size-4" />
      </span>
      <div class="min-w-0 flex-1">
        <p dir="auto" class="truncate text-label text-foreground">{{ props.agent.name }}</p>
        <p v-if="props.agent.subtitle" dir="auto" class="truncate text-caption text-muted-foreground">{{ props.agent.subtitle }}</p>
      </div>
      <span v-if="props.elapsed !== undefined" class="tabular-nums text-body-sm text-muted-foreground" :aria-label="t.duration">
        <bdi dir="ltr">{{ formatCallTime(props.elapsed) }}</bdi>
      </span>
    </header>

    <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6">
      <NqVoiceVisualizer :state="props.state" :level="props.level" :muted="props.muted" :labels="props.labels" class="w-full max-w-md" />
      <div role="status" aria-live="polite" class="flex min-h-14 flex-col items-center gap-2 text-center">
        <NqAiThinking v-if="props.state === 'thinking'" :label="t.states.thinking" />
        <span v-else-if="props.state === 'connecting'" class="inline-flex items-center gap-2 text-body text-muted-foreground">
          <NqSpinner /> {{ t.states.connecting }}
        </span>
        <span v-else-if="props.state === 'error'" class="inline-flex items-center gap-2 text-body text-nq-danger-text">
          <TriangleAlert aria-hidden="true" class="size-4" /> {{ props.error ?? t.states.error }}
        </span>
        <span v-else class="inline-flex items-center gap-2 text-body text-foreground">
          <MicOff v-if="props.state === 'listening' && props.muted" aria-hidden="true" class="size-4 text-muted-foreground" />
          {{ stateText }}
        </span>
        <NqButton v-if="props.state === 'error' && props.onRetry" size="sm" @click="props.onRetry()">{{ t.retry }}</NqButton>
        <NqButton v-if="props.state === 'speaking' && props.onInterrupt" size="sm" variant="ghost" @click="props.onInterrupt()">{{ t.interrupt }}</NqButton>
      </div>

      <div v-if="show" role="log" :aria-label="t.captions" aria-live="off" class="flex min-h-24 w-full max-w-xl flex-col justify-end gap-1.5 text-center">
        <p v-if="lines.length === 0" class="text-body-sm text-muted-foreground">{{ t.noCaptions }}</p>
        <template v-else>
          <p
            v-for="(line, i) in lines"
            :key="line.id"
            dir="auto"
            :class="cn('text-body', line.role === 'agent' ? 'text-foreground' : 'text-muted-foreground', i < lines.length - 1 && 'opacity-70')"
          >
            <span v-if="line.role === 'user'" class="me-1.5 text-caption text-muted-foreground">{{ t.you }}</span>
            {{ line.text }}
          </p>
        </template>
      </div>
    </div>

    <footer class="flex items-center justify-center gap-3 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <NqButton
        size="icon"
        :variant="props.muted ? 'primary' : 'secondary'"
        class="size-12 rounded-full"
        :aria-pressed="props.muted"
        :aria-label="props.muted ? t.unmute : t.mute"
        :disabled="props.state === 'connecting'"
        @click="emit('update:muted', !props.muted)"
      >
        <MicOff v-if="props.muted" aria-hidden="true" />
        <Mic v-else aria-hidden="true" />
      </NqButton>
      <NqButton size="icon" :variant="show ? 'primary' : 'secondary'" class="size-12 rounded-full" :aria-pressed="show" :aria-label="show ? t.captionsOff : t.captionsOn" @click="toggleCaptions">
        <Captions aria-hidden="true" />
      </NqButton>
      <slot name="extra-controls" />
      <NqButton size="icon" variant="danger" class="size-14 rounded-full" :aria-label="ending ? t.ending : t.end" :loading="ending" @click="end">
        <PhoneOff aria-hidden="true" />
      </NqButton>
    </footer>
  </div>
</template>
