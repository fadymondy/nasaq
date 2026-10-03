<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqNum } from "../numeric";
import { NqProgress } from "../progress";
import { confidenceLevel, confidencePercent } from "./ai-states-logic";
import { aiStatesWords, type AiStatesLabels } from "./labels";

// How sure the model is: a small bar, the level as a word and the percentage. Never colour alone.
const props = defineProps<{
  /** 0 to 1. */
  value: number;
  labels?: Partial<AiStatesLabels>;
  class?: HTMLAttributes["class"];
}>();
const TONE = { high: "success", medium: "warning", low: "danger" } as const;
const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
const level = computed(() => confidenceLevel(props.value));
const pct = computed(() => confidencePercent(props.value));
</script>

<template>
  <div data-slot="ai-confidence" :data-level="level" :class="cn('flex items-center gap-2 text-caption text-muted-foreground', props.class)">
    <span>{{ t.confidence }}</span>
    <NqProgress :value="pct" size="sm" :tone="TONE[level]" :aria-label="t.confidence" class="w-16" />
    <span class="text-foreground">
      {{ t[level] }} <NqNum :value="pct / 100" :format="{ style: 'percent' }" />
    </span>
  </div>
</template>
