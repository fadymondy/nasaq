<script setup lang="ts">
import { RefreshCw, Square } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { aiStatesWords, type AiStatesLabels } from "./labels";
import type { AiStreamState } from "./types";

// Stop while it writes, Regenerate once it is done, stopped or failed.
const props = defineProps<{
  state: AiStreamState;
  onStop?: () => void;
  onRegenerate?: () => void;
  labels?: Partial<AiStatesLabels>;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
</script>

<template>
  <div data-slot="ai-stream-controls" :data-state="props.state" :class="cn('flex flex-wrap items-center gap-2', props.class)">
    <NqButton v-if="props.state === 'streaming'" size="sm" variant="secondary" @click="props.onStop?.()">
      <Square aria-hidden="true" class="fill-current" />
      {{ t.stop }}
    </NqButton>
    <NqButton v-else-if="props.state !== 'idle' && props.onRegenerate" size="sm" variant="secondary" @click="props.onRegenerate?.()">
      <NqIcon :icon="RefreshCw" />
      {{ t.regenerate }}
    </NqButton>
    <span role="status" class="text-caption text-muted-foreground">{{ props.state === "streaming" ? t.streaming : props.state === "stopped" ? t.stopped : props.state === "error" ? t.failed : "" }}</span>
  </div>
</template>
