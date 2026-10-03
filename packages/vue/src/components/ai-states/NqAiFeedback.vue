<script setup lang="ts">
import { ThumbsDown, ThumbsUp } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { aiStatesWords, type AiStatesLabels } from "./labels";

// Thumbs up and down. The chosen one is pressed; the rest of the summary stays as it is.
const props = defineProps<{
  value?: "up" | "down" | null;
  onChange?: (value: "up" | "down") => void;
  labels?: Partial<AiStatesLabels>;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
</script>

<template>
  <div data-slot="ai-feedback" role="group" :class="cn('inline-flex items-center', props.class)">
    <NqButton variant="ghost" size="icon-sm" :aria-label="t.good" :aria-pressed="props.value === 'up'" class="aria-pressed:text-nq-success-text" @click="props.onChange?.('up')">
      <ThumbsUp aria-hidden="true" />
    </NqButton>
    <NqButton variant="ghost" size="icon-sm" :aria-label="t.bad" :aria-pressed="props.value === 'down'" class="aria-pressed:text-nq-danger-text" @click="props.onChange?.('down')">
      <ThumbsDown aria-hidden="true" />
    </NqButton>
    <span role="status" class="sr-only">{{ props.value ? t.thanks : "" }}</span>
  </div>
</template>
