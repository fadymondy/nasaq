<script setup lang="ts">
import { Check, Sparkles } from "lucide-vue-next";
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqBadge from "../badge/NqBadge.vue";
import { NqCard, NqCardContent, NqCardDescription, NqCardTitle } from "../card";
import { formatDate } from "../numeric/format";
import NqProgress from "../progress/NqProgress.vue";
import NqAchievementMedal from "./NqAchievementMedal.vue";
import NqRarityBadge from "./NqRarityBadge.vue";
import { achievementPercent, achievementStatus } from "./gamification-logic";
import type { GamificationLabels } from "./strings";
import type { Achievement } from "./types";
import { useKit } from "./use-kit";

// One achievement in full: the badge, what it takes, how far along, when it was earned and what it pays.
// The `actions` slot goes under the description, e.g. a share button.
interface Props {
  achievement: Achievement;
  labels?: Partial<GamificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t, locale, num } = useKit(() => props.labels);
const a = computed(() => props.achievement);
const status = computed(() => achievementStatus(a.value));
const hidden = computed(() => !!a.value.secret && status.value !== "earned");
const goal = computed(() => (a.value.goal && a.value.goal > 0 ? a.value.goal : 1));
const titleId = useId();
</script>

<template>
  <NqCard role="group" :aria-labelledby="titleId" data-slot="achievement-card" :data-status="status" :class="cn('min-w-0', props.class)">
    <NqCardContent class="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-start">
      <NqAchievementMedal :achievement="hidden ? { ...a, icon: undefined } : a" size="lg" />
      <div class="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
        <div class="flex flex-col items-center gap-1.5 sm:items-start">
          <div class="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            <NqRarityBadge :rarity="a.rarity ?? 'common'" :labels="props.labels" />
            <NqBadge v-if="a.xp" variant="accent">
              <Sparkles aria-hidden="true" />
              {{ t.xpReward(num(a.xp)) }}
            </NqBadge>
          </div>
          <NqCardTitle as="h3" class="text-body" :id="titleId">
            <span dir="auto">{{ hidden ? t.secret : a.title }}</span>
          </NqCardTitle>
          <NqCardDescription>
            <span dir="auto">{{ hidden ? t.secretHint : a.description }}</span>
          </NqCardDescription>
        </div>
        <p v-if="status === 'earned'" class="inline-flex items-center gap-1.5 text-body-sm text-nq-success-text">
          <Check aria-hidden="true" class="size-4" />
          {{ a.earnedAt ? t.earnedOn(formatDate(a.earnedAt, locale, { dateStyle: "medium" })) : t.earned }}
        </p>
        <NqProgress v-else :value="achievementPercent(a)" :label="status === 'locked' ? t.locked : t.inProgress" :value-text="t.progressOf(num(a.progress ?? 0), num(goal))" class="w-full max-w-sm" />
        <div v-if="$slots.actions" class="flex flex-wrap gap-2"><slot name="actions" /></div>
      </div>
    </NqCardContent>
  </NqCard>
</template>
