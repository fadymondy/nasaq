<script setup lang="ts">
import { Flame } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { GamificationLabels } from "./strings";
import { useKit } from "./use-kit";

// The flame and the number of days in a row. The longest run and a nudge when today is still open.
interface Props {
  /** Consecutive days. */
  current: number;
  longest?: number;
  /** Today is not done yet and the streak will break tonight. */
  atRisk?: boolean;
  labels?: Partial<GamificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { longest: undefined, atRisk: false, labels: undefined });
const { t, num } = useKit(() => props.labels);
</script>

<template>
  <div data-slot="streak-counter" :data-at-risk="props.atRisk ? '' : undefined" :class="cn('flex items-center gap-3', props.class)">
    <span aria-hidden="true" :class="cn('grid size-12 shrink-0 place-items-center rounded-full', props.current > 0 ? 'bg-nq-warning-soft text-nq-warning-text' : 'bg-secondary text-muted-foreground')">
      <Flame :class="cn('size-6', props.current > 0 && 'fill-current')" />
    </span>
    <div class="flex min-w-0 flex-col">
      <span class="flex items-baseline gap-1.5">
        <span class="text-h2 tabular-nums text-foreground">{{ num(props.current) }}</span>
        <span class="text-body-sm text-muted-foreground">{{ t.streak }}</span>
      </span>
      <span class="text-caption text-muted-foreground">
        <span v-if="props.atRisk" class="text-nq-warning-text">{{ t.atRisk }}</span>
        <template v-else-if="props.longest !== undefined">{{ t.longest(num(props.longest)) }}</template>
      </span>
    </div>
  </div>
</template>
