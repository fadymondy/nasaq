<script setup lang="ts">
import { Lock, Trophy } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { achievementPercent, achievementStatus } from "./gamification-logic";
import { RARITY_STYLE } from "./strings";
import type { Achievement } from "./types";

// The round badge. Earned: solid ring in the rarity colour. In progress: the ring fills as the goal is reached.
// Locked: dashed and dimmed with a lock. Decorative; the words that go with it carry the state.
const MEDAL_SIZE = {
  sm: { box: "size-14", icon: "size-6", ring: 56 },
  md: { box: "size-16", icon: "size-7", ring: 64 },
  lg: { box: "size-24", icon: "size-10", ring: 96 },
} as const;

interface Props {
  achievement: Achievement;
  size?: keyof typeof MEDAL_SIZE;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { size: "md" });
const status = computed(() => achievementStatus(props.achievement));
const pct = computed(() => achievementPercent(props.achievement));
const s = computed(() => RARITY_STYLE[props.achievement.rarity ?? "common"]);
const dim = computed(() => MEDAL_SIZE[props.size]);
const stroke = 4;
const radius = computed(() => (dim.value.ring - stroke) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
</script>

<template>
  <span
    aria-hidden="true"
    data-slot="achievement-medal"
    :data-status="status"
    :data-rarity="props.achievement.rarity ?? 'common'"
    :class="cn('relative inline-grid shrink-0 place-items-center rounded-full', dim.box, props.class)"
  >
    <svg v-if="status === 'in-progress'" :viewBox="`0 0 ${dim.ring} ${dim.ring}`" :class="cn('absolute inset-0 -rotate-90 rtl:scale-x-[-1]', s.text)">
      <circle :cx="dim.ring / 2" :cy="dim.ring / 2" :r="radius" fill="none" :stroke-width="stroke" class="stroke-nq-line" />
      <circle
        :cx="dim.ring / 2"
        :cy="dim.ring / 2"
        :r="radius"
        fill="none"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="circumference * (1 - pct / 100)"
        class="stroke-current transition-[stroke-dashoffset] duration-300 ease-nq motion-reduce:transition-none"
      />
    </svg>
    <span v-else :class="cn('absolute inset-0 rounded-full border-2', status === 'earned' ? cn(s.ring, s.soft) : 'border-dashed border-nq-line-strong bg-secondary')" />
    <span :class="cn('relative grid place-items-center rounded-full', status === 'in-progress' ? 'size-[72%]' : 'size-[68%]', status === 'in-progress' && s.soft)">
      <Lock v-if="status === 'locked'" :class="cn('text-muted-foreground', props.size === 'lg' ? 'size-8' : 'size-5')" />
      <component :is="props.achievement.icon ?? Trophy" v-else :class="cn(dim.icon, s.text, status === 'in-progress' && 'opacity-80')" />
    </span>
  </span>
</template>
