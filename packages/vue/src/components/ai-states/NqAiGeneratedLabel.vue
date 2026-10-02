<script setup lang="ts">
import { Sparkles } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { aiStatesWords, type AiStatesLabels } from "./labels";

// The "AI generated" mark that goes on anything a model wrote.
const props = defineProps<{
  /** Model or feature name after the label, e.g. "Claude". Kept left to right. */
  model?: string;
  labels?: Partial<AiStatesLabels>;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
</script>

<template>
  <NqBadge data-slot="ai-generated-label" variant="accent" :class="cn('gap-1', props.class)">
    <Sparkles aria-hidden="true" />
    {{ t.aiGenerated }}
    <bdi v-if="props.model" dir="ltr" class="font-normal opacity-80">{{ props.model }}</bdi>
  </NqBadge>
</template>
