<script setup lang="ts">
import { ArrowDown, ArrowUp, Minus } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import NqBadge from "../badge/NqBadge.vue";
import { movement } from "./gamification-logic";
import type { GamificationLabels } from "./strings";
import { useKit } from "./use-kit";

// Change since the last period: an arrow, the number of places and a screen-reader sentence. Internal to NqLeaderboard.
interface Props {
  rank: number;
  previousRank?: number;
  labels?: Partial<GamificationLabels>;
}
const props = defineProps<Props>();
const { t, num } = useKit(() => props.labels);
const m = computed(() => movement({ rank: props.rank, previousRank: props.previousRank }));
const text = computed(() => (m.value.direction === "up" ? t.value.movedUp(num(m.value.by)) : m.value.direction === "down" ? t.value.movedDown(num(m.value.by)) : t.value.same));
</script>

<template>
  <NqBadge v-if="m.direction === 'new'" variant="info">{{ t.isNew }}</NqBadge>
  <span
    v-else
    :data-movement="m.direction"
    :class="cn('inline-flex items-center gap-0.5 text-caption tabular-nums', m.direction === 'up' ? 'text-nq-success-text' : m.direction === 'down' ? 'text-nq-danger-text' : 'text-muted-foreground')"
  >
    <ArrowUp v-if="m.direction === 'up'" aria-hidden="true" class="size-3.5" />
    <ArrowDown v-else-if="m.direction === 'down'" aria-hidden="true" class="size-3.5" />
    <Minus v-else aria-hidden="true" class="size-3.5" />
    <span v-if="m.direction !== 'same'" aria-hidden="true">{{ num(m.by) }}</span>
    <span class="sr-only">{{ text }}</span>
  </span>
</template>
