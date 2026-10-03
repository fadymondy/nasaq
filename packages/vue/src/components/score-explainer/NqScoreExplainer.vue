<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAiConfidenceMeter, NqAiGeneratedLabel } from "../ai-states";
import { NqBadge } from "../badge";
import { NqNum } from "../numeric";
import { NqProgress } from "../progress";
import { scoreExplainerWords, type ScoreExplainerLabelOverrides } from "./labels";
import NqScoreInferredMark from "./NqScoreInferredMark.vue";
import NqScoreSourceChip from "./NqScoreSourceChip.vue";
import { clampScore, scoreDimensionFill, scoreExplainerBand, scoreRemainder, sortScoreDimensions } from "./score-explainer-logic";
import type { ScoreDimension, ScoreSource } from "./types";

// The reasons behind a score: the total with its band and confidence, then one row per dimension with the points it adds, a plain
// sentence, what matched, and source chips. Anything a model worked out rather than read is marked "Inferred". The rows always add up
// to the score: a gap shows as "Other factors".
const props = withDefaults(
  defineProps<{
    /** The total, from 0 to `max`. */
    score: number;
    /** Default 100. */
    max?: number;
    dimensions: ScoreDimension[];
    /** One line above the reasons: "Strong fit, recently active." (or use the `summary` slot). */
    summary?: string;
    /** Overall confidence, 0 to 1. */
    confidence?: number;
    /** The whole score was produced by a model. Shows "AI generated". */
    model?: string;
    /** Set when the score is AI generated, with or without a model name. */
    aiGenerated?: boolean;
    /** Hides matched words and per-dimension confidence, for a small popover. */
    compact?: boolean;
    /** Called when a source chip without a URL is pressed. */
    onSourceClick?: (source: ScoreSource, dimension: ScoreDimension) => void;
    labels?: ScoreExplainerLabelOverrides;
    class?: HTMLAttributes["class"];
  }>(),
  { max: 100, summary: undefined, confidence: undefined, model: undefined, aiGenerated: false, compact: false, onSourceClick: undefined, labels: undefined },
);
const nq = useNasaq();
const t = computed(() => scoreExplainerWords(nq.locale.value, props.labels));
const id = useId();
const shown = computed(() => clampScore(props.score, props.max));
const band = computed(() => scoreExplainerBand(shown.value, props.max));
const rows = computed(() => sortScoreDimensions(props.dimensions));
const remainder = computed(() => scoreRemainder(shown.value, props.dimensions));
const TONE = { high: "success", medium: "warning", low: "danger" } as const;
const round1 = (n: number) => Math.round(n * 10) / 10;
const fill = (d: ScoreDimension) => scoreDimensionFill(d, props.max) * 100;
const fillTone = (d: ScoreDimension) => TONE[scoreExplainerBand(fill(d))];
</script>

<template>
  <section data-slot="score-explainer" :data-band="band" :aria-labelledby="`${id}-title`" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <header class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div class="flex items-baseline gap-1.5">
        <span class="text-display-sm tabular-nums text-foreground" aria-hidden="true"><NqNum :value="Math.round(shown)" /></span>
        <span class="text-body-sm text-muted-foreground">{{ t.outOf(String(props.max)) }}</span>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex flex-wrap items-center gap-1.5">
          <h3 :id="`${id}-title`" class="text-title-sm text-foreground">{{ t.why }}</h3>
          <NqBadge :variant="TONE[band]">{{ t.bands[band] }}</NqBadge>
          <NqAiGeneratedLabel v-if="props.aiGenerated || props.model" :model="props.model" />
        </div>
        <p v-if="props.summary || $slots.summary" class="text-body-sm text-muted-foreground"><slot name="summary">{{ props.summary }}</slot></p>
      </div>
    </header>
    <NqAiConfidenceMeter v-if="props.confidence != null" :value="props.confidence" />

    <p v-if="rows.length === 0 && remainder === 0" class="text-body-sm text-muted-foreground">{{ t.noDimensions }}</p>
    <ul data-slot="score-dimensions" class="flex flex-col gap-4">
      <li v-for="d in rows" :key="d.id" data-slot="score-dimension" class="flex min-w-0 flex-col gap-1.5">
        <div class="flex items-baseline justify-between gap-3">
          <span class="flex min-w-0 flex-wrap items-center gap-1.5 text-label text-foreground">
            <span dir="auto">{{ d.label }}</span>
            <NqScoreInferredMark v-if="d.inferred" :labels="props.labels" />
          </span>
          <span class="shrink-0 text-body-sm text-muted-foreground">
            {{ d.maxPoints ? t.points(String(round1(d.points)), String(d.maxPoints)) : t.pointsNoMax(String(round1(d.points))) }}
          </span>
        </div>
        <NqProgress :value="fill(d)" size="sm" :tone="fillTone(d)" :aria-label="d.label" />
        <p dir="auto" class="text-body-sm text-muted-foreground">{{ d.reason }}</p>
        <div v-if="!props.compact && d.matched?.length" class="flex flex-wrap items-center gap-1">
          <span class="text-caption text-muted-foreground">{{ t.matched }}</span>
          <NqBadge v-for="m in d.matched" :key="m" variant="outline" dir="auto">{{ m }}</NqBadge>
        </div>
        <div v-if="d.sources?.length" class="flex flex-wrap items-center gap-1.5" role="group" :aria-label="`${t.sources}: ${d.label}`">
          <NqScoreSourceChip
            v-for="s in d.sources"
            :key="`${s.kind ?? ''}${s.label}`"
            :source="s"
            :labels="props.labels"
            :on-click="props.onSourceClick ? () => props.onSourceClick!(s, d) : undefined"
          />
        </div>
        <NqAiConfidenceMeter v-if="!props.compact && d.confidence != null" :value="d.confidence" />
      </li>
      <li v-if="remainder !== 0" data-slot="score-dimension" class="flex min-w-0 flex-col gap-1">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-label text-foreground">{{ t.other }}</span>
          <span class="text-body-sm text-muted-foreground">{{ t.pointsNoMax(`${remainder > 0 ? "+" : ""}${remainder}`) }}</span>
        </div>
        <p class="text-body-sm text-muted-foreground">{{ t.otherReason }}</p>
      </li>
    </ul>
  </section>
</template>
