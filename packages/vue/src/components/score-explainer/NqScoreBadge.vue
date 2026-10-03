<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqNum } from "../numeric";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import { scoreExplainerWords, type ScoreExplainerLabelOverrides } from "./labels";
import NqScoreExplainer from "./NqScoreExplainer.vue";
import { clampScore, scoreExplainerBand } from "./score-explainer-logic";
import type { ScoreDimension, ScoreSource } from "./types";

// A 0-100 score as a small badge (number and band word, never colour alone). Pressing it opens a popover with the ScoreExplainer.
// A dashed outline and "≈" mark a score the model inferred.
const props = withDefaults(
  defineProps<{
    score: number;
    max?: number;
    dimensions: ScoreDimension[];
    summary?: string;
    confidence?: number;
    model?: string;
    aiGenerated?: boolean;
    onSourceClick?: (source: ScoreSource, dimension: ScoreDimension) => void;
    labels?: ScoreExplainerLabelOverrides;
    /** Where the popover opens. */
    side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
    /** Start open. */
    defaultOpen?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  { max: 100, summary: undefined, confidence: undefined, model: undefined, aiGenerated: false, onSourceClick: undefined, labels: undefined, side: "bottom", defaultOpen: false },
);
const nq = useNasaq();
const t = computed(() => scoreExplainerWords(nq.locale.value, props.labels));
const shown = computed(() => clampScore(props.score, props.max));
const band = computed(() => scoreExplainerBand(shown.value, props.max));
const inferred = computed(() => props.aiGenerated || props.dimensions.some((d) => d.inferred));
</script>

<template>
  <NqPopover :default-open="props.defaultOpen">
    <NqPopoverTrigger
      data-slot="score-badge"
      :data-band="band"
      :aria-label="t.ariaBadge(String(Math.round(shown)), String(props.max), t.bands[band])"
      :class="
        cn(
          'inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border px-2 text-caption font-medium outline-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus hover:bg-nq-hover',
          band === 'high' && 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
          band === 'medium' && 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text',
          band === 'low' && 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
          inferred && 'border-dashed',
          props.class,
        )
      "
    >
      <span v-if="inferred" aria-hidden="true">≈</span>
      <NqNum :value="Math.round(shown)" class="text-body-sm" />
      <span>{{ t.bands[band] }}</span>
    </NqPopoverTrigger>
    <NqPopoverContent :side="props.side" align="start" class="w-[min(26rem,calc(100vw-2rem))] p-4">
      <NqScoreExplainer
        :score="props.score"
        :max="props.max"
        :dimensions="props.dimensions"
        :summary="props.summary"
        :confidence="props.confidence"
        :model="props.model"
        :ai-generated="props.aiGenerated"
        :on-source-click="props.onSourceClick"
        :labels="props.labels"
        compact
      />
    </NqPopoverContent>
  </NqPopover>
</template>
