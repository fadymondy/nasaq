<script setup lang="ts">
import { ArrowDown, ArrowUp, Minus } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { KEYWORD_STRINGS, type KeywordTrackerLabels } from "./keyword-labels";
import { rankChange, type RankPosition } from "./rank-math";

// How a keyword moved: an arrow and the places gained or lost, or New and Lost. Lower positions are better.
const props = defineProps<{
  current: RankPosition;
  previous?: RankPosition;
  labels?: Partial<KeywordTrackerLabels>;
  class?: HTMLAttributes["class"];
}>();
const t = useAnalyticsLabels(KEYWORD_STRINGS, () => props.labels);
const move = computed(() => rankChange(props.previous, props.current));
const up = computed(() => move.value.direction === "up");
const n = computed(() => Math.abs(move.value.delta));
const text = computed(() => (up.value ? t.value.up(n.value) : t.value.down(n.value)));
</script>

<template>
  <template v-if="move.direction === 'none'" />
  <NqBadge v-else-if="move.direction === 'new'" variant="info" :class="props.class">{{ t.newRank }}</NqBadge>
  <NqBadge v-else-if="move.direction === 'lost'" variant="danger" :class="props.class">{{ t.lostRank }}</NqBadge>
  <span v-else-if="move.direction === 'same'" :class="cn('inline-flex items-center gap-0.5 text-caption text-muted-foreground', props.class)" :title="t.same">
    <Minus aria-hidden="true" class="size-3" />
    <span class="sr-only">{{ t.same }}</span>
  </span>
  <span v-else :data-direction="move.direction" :class="cn('inline-flex items-center gap-0.5 text-caption font-medium', up ? 'text-nq-success-text' : 'text-nq-danger-text', props.class)" :title="text">
    <component :is="up ? ArrowUp : ArrowDown" aria-hidden="true" class="size-3" />
    <NqNum :value="n" />
    <span class="sr-only">{{ text }}</span>
  </span>
</template>
