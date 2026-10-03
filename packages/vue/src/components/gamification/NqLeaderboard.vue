<script setup lang="ts">
import { Crown, Trophy } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqAvatar from "../avatar/NqAvatar.vue";
import NqBadge from "../badge/NqBadge.vue";
import NqNum from "../numeric/NqNum.vue";
import NqEmptyState from "../states/NqEmptyState.vue";
import NqSkeleton from "../states/NqSkeleton.vue";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsTab } from "../tabs";
import NqLeaderboardMovement from "./NqLeaderboardMovement.vue";
import { pinnedEntry, rankEntries, splitPodium, type Ranked } from "./gamification-logic";
import type { GamificationLabels } from "./strings";
import type { LeaderboardEntry, LeaderboardPeriod } from "./types";
import { useKit } from "./use-kit";

// Ranking of people or teams: period tabs, a podium for the top three, the rest as a list with movement
// since the last period, and your own row pinned at the bottom when you are further down.
// The `title` slot replaces the heading text.
interface Props {
  entries: readonly LeaderboardEntry[];
  /** The signed-in person. Their row is highlighted, and pinned below the list when they are outside it. */
  youId?: string;
  /** Period tabs, e.g. This week, This month, All time. */
  periods?: readonly LeaderboardPeriod[];
  /** Controlled period id. Without it the board keeps its own. */
  period?: string;
  /** Unit after the score, e.g. "XP" or "pts". */
  unit?: string;
  /** Rows shown, podium included. Others sit behind the pinned row. Default 10. */
  limit?: number;
  /** Show the top three on a podium. Default true. */
  podium?: boolean;
  loading?: boolean;
  labels?: Partial<GamificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { youId: undefined, periods: undefined, period: undefined, unit: undefined, limit: 10, podium: true, loading: false, labels: undefined });
const emit = defineEmits<{ periodChange: [id: string] }>();
const { t, num } = useKit(() => props.labels);

const PODIUM = {
  1: { height: "h-24", order: "order-2", tone: "border-nq-accent bg-nq-accent/15 text-nq-accent-text" },
  2: { height: "h-16", order: "order-1", tone: "border-nq-line-strong bg-secondary text-foreground" },
  3: { height: "h-12", order: "order-3", tone: "border-nq-line-strong bg-secondary text-foreground" },
} as const;

const localPeriod = ref(props.periods?.[0]?.id);
const activePeriod = computed(() => props.period ?? localPeriod.value);
const ranked = computed(() => rankEntries(props.entries));
const visible = computed(() => ranked.value.slice(0, props.limit));
const split = computed(() => splitPodium(visible.value, props.podium));
const pinned = computed(() => pinnedEntry(ranked.value, props.youId, visible.value.length));
const headingId = useId();
const setPeriod = (v: string | number) => {
  localPeriod.value = String(v);
  emit("periodChange", String(v));
};
const podiumOf = (rank: number) => PODIUM[Math.min(3, rank) as 1 | 2 | 3];
type Row = Ranked<LeaderboardEntry>;
</script>

<template>
  <section data-slot="leaderboard" :aria-labelledby="headingId" :class="cn('min-w-0 overflow-hidden rounded-card border border-border bg-card', props.class)">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <h2 :id="headingId" class="flex items-center gap-2 text-label text-foreground">
        <Trophy aria-hidden="true" class="size-4 text-nq-accent-text" />
        <slot name="title">{{ t.leaderboard }}</slot>
      </h2>
      <NqTabs v-if="props.periods?.length" :model-value="activePeriod" @update:model-value="setPeriod">
        <NqTabsList :aria-label="t.period">
          <NqTabsTab v-for="p in props.periods" :key="p.id" :value="p.id">{{ p.label }}</NqTabsTab>
          <NqTabsIndicator />
        </NqTabsList>
      </NqTabs>
    </header>

    <div v-if="props.loading" role="status" aria-busy="true" class="flex flex-col gap-3 p-4">
      <span class="sr-only">…</span>
      <div v-for="i in 5" :key="i" class="flex items-center gap-3">
        <NqSkeleton class="size-8 rounded-full" />
        <NqSkeleton class="h-3 flex-1" />
        <NqSkeleton class="h-3 w-12" />
      </div>
    </div>
    <NqEmptyState v-else-if="ranked.length === 0" :icon="Trophy" :title="t.emptyBoard" :description="t.emptyBoardHint" class="m-4 border-0" />
    <template v-else>
      <ol v-if="split.top.length" data-slot="leaderboard-podium" class="flex items-end justify-center gap-2 border-b border-border px-4 pt-6 sm:gap-4">
        <li v-for="e in split.top" :key="e.id" :data-you="e.id === props.youId ? '' : undefined" :class="cn('flex min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 sm:max-w-40', podiumOf(e.rank).order)">
          <span class="relative">
            <Crown v-if="e.rank === 1" aria-hidden="true" class="absolute -top-4 start-1/2 size-5 -translate-x-1/2 text-nq-accent-text rtl:translate-x-1/2" />
            <NqAvatar :name="e.name" :src="e.avatar" size="lg" :class="cn('size-14 text-body ring-2 ring-offset-2 ring-offset-card', e.rank === 1 ? 'ring-nq-accent' : 'ring-nq-line-strong')" />
          </span>
          <span class="flex w-full min-w-0 flex-col items-center text-center">
            <bdi dir="auto" class="w-full truncate text-label text-foreground">{{ e.name }}</bdi>
            <span class="text-caption">
              <span class="tabular-nums text-foreground">
                <NqNum :value="e.score" />
                <span v-if="props.unit" class="ms-1 text-caption text-muted-foreground">{{ props.unit }}</span>
              </span>
            </span>
          </span>
          <span :class="cn('flex w-full flex-col items-center justify-start gap-0.5 rounded-t-control border border-b-0 pt-2 text-h3 tabular-nums', podiumOf(e.rank).height, podiumOf(e.rank).tone)">
            <span class="sr-only">{{ t.rank }}</span>
            {{ num(e.rank) }}
            <NqLeaderboardMovement :rank="e.rank" :previous-rank="e.previousRank" :labels="props.labels" />
          </span>
        </li>
      </ol>

      <ol v-if="split.rest.length" class="divide-y divide-border">
        <template v-for="e in split.rest" :key="e.id">
          <li :data-you="e.id === props.youId ? '' : undefined" :aria-current="e.id === props.youId ? 'true' : undefined" :class="cn('flex min-h-14 items-center gap-3 px-4 py-2', e.id === props.youId && 'bg-nq-selected')">
            <span class="w-8 shrink-0 text-center text-label tabular-nums text-muted-foreground"><span class="sr-only">{{ t.rank }} </span>{{ num(e.rank) }}</span>
            <NqAvatar :name="e.name" :src="e.avatar" size="md" />
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="flex items-center gap-1.5">
                <bdi dir="auto" class="truncate text-label text-foreground">{{ e.name }}</bdi>
                <NqBadge v-if="e.id === props.youId" variant="brand">{{ t.you }}</NqBadge>
              </span>
              <span v-if="e.subtitle" dir="auto" class="truncate text-caption text-muted-foreground">{{ e.subtitle }}</span>
            </span>
            <NqLeaderboardMovement :rank="e.rank" :previous-rank="e.previousRank" :labels="props.labels" />
            <span class="min-w-16 text-end text-body-sm">
              <span class="tabular-nums text-foreground">
                <NqNum :value="e.score" />
                <span v-if="props.unit" class="ms-1 text-caption text-muted-foreground">{{ props.unit }}</span>
              </span>
            </span>
          </li>
        </template>
      </ol>

      <ol v-if="pinned" :aria-label="t.yourRank" class="sticky bottom-0 shadow-[0_-4px_8px_-6px_color-mix(in_oklab,var(--nq-fg)_25%,transparent)]">
        <li data-you="" aria-current="true" class="flex min-h-14 items-center gap-3 border-t border-border bg-card px-4 py-2">
          <span class="w-8 shrink-0 text-center text-label tabular-nums text-muted-foreground"><span class="sr-only">{{ t.rank }} </span>{{ num((pinned as Row).rank) }}</span>
          <NqAvatar :name="pinned.name" :src="pinned.avatar" size="md" />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="flex items-center gap-1.5">
              <bdi dir="auto" class="truncate text-label text-foreground">{{ pinned.name }}</bdi>
              <NqBadge variant="brand">{{ t.you }}</NqBadge>
            </span>
            <span v-if="pinned.subtitle" dir="auto" class="truncate text-caption text-muted-foreground">{{ pinned.subtitle }}</span>
          </span>
          <NqLeaderboardMovement :rank="(pinned as Row).rank" :previous-rank="pinned.previousRank" :labels="props.labels" />
          <span class="min-w-16 text-end text-body-sm">
            <span class="tabular-nums text-foreground">
              <NqNum :value="pinned.score" />
              <span v-if="props.unit" class="ms-1 text-caption text-muted-foreground">{{ props.unit }}</span>
            </span>
          </span>
        </li>
      </ol>
    </template>
  </section>
</template>
