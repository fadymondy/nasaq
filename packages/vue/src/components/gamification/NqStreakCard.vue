<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent } from "../card";
import NqStreakCalendar from "./NqStreakCalendar.vue";
import NqStreakCounter from "./NqStreakCounter.vue";
import { streakStats } from "./gamification-logic";
import type { GamificationLabels } from "./strings";

// The counter and the calendar together, with the numbers worked out from the active days.
interface Props {
  activeDays: readonly (Date | string | number)[];
  today?: Date;
  weekStart?: number;
  labels?: Partial<GamificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { today: undefined, weekStart: undefined, labels: undefined });
const today = computed(() => props.today ?? new Date());
const stats = computed(() => streakStats(props.activeDays, today.value));
</script>

<template>
  <NqCard data-slot="streak-card" :class="cn('min-w-0', props.class)">
    <NqCardContent class="flex flex-col gap-4">
      <NqStreakCounter :current="stats.current" :longest="stats.longest" :at-risk="stats.atRisk" :labels="props.labels" />
      <NqStreakCalendar :active-days="props.activeDays" :today="today" :week-start="props.weekStart" :labels="props.labels" class="max-w-none" />
    </NqCardContent>
  </NqCard>
</template>
