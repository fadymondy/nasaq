<script setup lang="ts">
import { Check, Sparkles } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqSpinner } from "../spinner";
import { cycleIndex, stepState } from "./ai-states-logic";
import { aiStatesWords, type AiStatesLabels } from "./labels";

// Three pulsing dots, the sparkle, and the stage the AI is in. Static (no pulse) under reduced motion.
const props = withDefaults(
  defineProps<{
    /** Text of the indicator when there are no steps. Default "Thinking". */
    label?: string;
    /** Named stages, e.g. "Reading the document", "Finding key points", "Writing". */
    steps?: readonly string[];
    /** Index of the running step. Omit to let the labels rotate on their own. */
    current?: number;
    /** One line that shows only the running step, instead of the whole list. */
    compact?: boolean;
    /** How often the labels rotate when `current` is not set, in ms. Default 1800. */
    interval?: number;
    labels?: Partial<AiStatesLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { label: undefined, steps: undefined, current: undefined, interval: 1800, labels: undefined },
);
const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
const list = computed(() => props.steps ?? []);
const auto = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
watch(
  [() => props.current, () => list.value.length, () => props.interval],
  () => {
    clearInterval(timer);
    if (props.current !== undefined || list.value.length < 2) return;
    timer = setInterval(() => (auto.value = cycleIndex(auto.value, list.value.length)), props.interval);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearInterval(timer));
const active = computed(() => props.current ?? auto.value);
const running = computed(() => list.value[Math.min(active.value, list.value.length - 1)]);
</script>

<template>
  <div data-slot="ai-thinking" role="status" aria-live="polite" :class="cn('flex flex-col gap-2 text-body-sm text-muted-foreground', props.class)">
    <span class="inline-flex items-center gap-2">
      <Sparkles aria-hidden="true" class="size-4 text-nq-accent-text motion-safe:animate-pulse" />
      <span>{{ props.compact && running ? running : (props.label ?? t.thinking) }}</span>
      <span aria-hidden="true" class="inline-flex items-center gap-1">
        <span v-for="i in [0, 1, 2]" :key="i" class="size-1.5 rounded-full bg-nq-accent motion-safe:animate-pulse" :style="{ animationDelay: `${i * 180}ms` }" />
      </span>
    </span>
    <ol v-if="!props.compact && list.length > 0" class="flex flex-col gap-1.5 ps-1">
      <li
        v-for="(s, i) in list"
        :key="s"
        :data-state="stepState(i, active)"
        :class="cn('flex items-center gap-2 text-caption', stepState(i, active) === 'pending' && 'opacity-60', stepState(i, active) === 'active' && 'text-foreground')"
      >
        <span aria-hidden="true" class="grid size-4 shrink-0 place-items-center">
          <Check v-if="stepState(i, active) === 'done'" class="size-3.5 text-nq-success-text" />
          <NqSpinner v-else-if="stepState(i, active) === 'active'" class="size-3.5" />
          <span v-else class="size-1.5 rounded-full bg-nq-line-strong" />
        </span>
        <span dir="auto">{{ s }}</span>
        <span class="sr-only">{{ stepState(i, active) === "done" ? t.stepDone : stepState(i, active) === "active" ? t.stepActive : t.stepPending }}</span>
      </li>
    </ol>
  </div>
</template>
