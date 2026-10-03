<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqProgress from "../progress/NqProgress.vue";
import { levelProgress, type LevelCurve } from "./gamification-logic";
import type { GamificationLabels } from "./strings";
import { useKit } from "./use-kit";

// The level and how far into it you are: a level number, "260 / 350 XP" and what is left to the next one.
interface Props {
  /** Lifetime XP. The level and the bar come from it and `curve`. */
  totalXp: number;
  curve?: LevelCurve;
  labels?: Partial<GamificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t, num } = useKit(() => props.labels);
const p = computed(() => levelProgress(props.totalXp, props.curve));
</script>

<template>
  <div data-slot="xp-progress" :data-level="p.level" :class="cn('flex items-center gap-3', props.class)">
    <span aria-hidden="true" class="grid size-12 shrink-0 place-items-center rounded-full border-2 border-nq-accent bg-nq-accent/15 text-h3 tabular-nums text-nq-accent-text">
      {{ num(p.level) }}
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-label text-foreground">{{ t.level(num(p.level)) }}</span>
        <span class="text-caption tabular-nums text-muted-foreground">
          <bdi>{{ t.xpOf(num(p.xp), num(p.span)) }}</bdi>
        </span>
      </div>
      <NqProgress :value="p.percent" size="sm" :aria-label="t.level(num(p.level))" />
      <span class="text-caption text-muted-foreground">
        <bdi>{{ t.xpToNext(num(p.remaining), num(p.level + 1)) }}</bdi>
      </span>
    </div>
  </div>
</template>
