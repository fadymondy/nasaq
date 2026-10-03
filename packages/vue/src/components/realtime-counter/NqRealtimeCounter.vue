<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqMiniBar } from "../chart";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqDateTime, NqNum } from "../numeric";

// The "right now" tile of an analytics page: a large live figure with a pulsing indicator, a per-minute bar strip,
// and short top lists. The indicator is a dot plus the word Live, so it does not depend on colour, and the pulse stops
// under reduced motion.

const STRINGS = {
  en: {
    title: "Right now",
    description: "People active in the last 30 minutes",
    live: "Live",
    paused: "Paused",
    perMinute: "Users per minute, last 30 minutes",
    updated: "Updated",
    empty: "Nobody is active right now",
    users: (n: number) => (n === 1 ? "1 active user" : `${n} active users`),
  },
  ar: {
    title: "الآن",
    description: "الأشخاص النشطون في آخر 30 دقيقة",
    live: "مباشر",
    paused: "متوقف مؤقتًا",
    perMinute: "المستخدمون في الدقيقة، آخر 30 دقيقة",
    updated: "آخر تحديث",
    empty: "لا أحد نشط الآن",
    users: (n: number) => (n === 1 ? "مستخدم نشط واحد" : `${n} مستخدمين نشطين`),
  },
};
export type RealtimeCounterLabels = typeof STRINGS.en;

export interface RealtimeSection {
  id: string;
  /** "Top pages", "Top sources". Localise it. */
  title: string;
  rows: readonly { id: string; label: string; value: number }[];
  /** Labels are paths or URLs: keep them left-to-right inside RTL. */
  ltr?: boolean;
}

const props = withDefaults(
  defineProps<{
    /** People active right now. */
    value: number;
    /** Active users for each of the last minutes, oldest first (30 values for a 30 minute window). */
    perMinute?: readonly number[];
    /** Lists under the counter, for example top pages and top sources. */
    sections?: readonly RealtimeSection[];
    /** When the figure was last refreshed. Shown as relative time. */
    updatedAt?: number | Date | string;
    /** Feed is running. False shows "Paused" and stops the pulse. Default true. */
    live?: boolean;
    title?: string;
    description?: string;
    labels?: Partial<RealtimeCounterLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { perMinute: undefined, sections: undefined, updatedAt: undefined, live: true, title: undefined, description: undefined, labels: undefined },
);
const t = useAnalyticsLabels(STRINGS, () => props.labels);
</script>

<template>
  <NqCard data-slot="realtime-counter" :data-live="live" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3">
        <span class="inline-flex items-center gap-2">
          <span aria-hidden="true" class="relative flex size-2.5">
            <span v-if="live" class="absolute inline-flex size-full rounded-full bg-nq-success opacity-60 motion-safe:animate-ping" />
            <span :class="cn('relative inline-flex size-2.5 rounded-full', live ? 'bg-nq-success' : 'bg-muted-foreground')" />
          </span>
          <slot name="title">{{ title ?? t.title }}</slot>
          <span class="text-caption font-normal text-muted-foreground">{{ live ? t.live : t.paused }}</span>
        </span>
      </NqCardTitle>
      <NqCardDescription><slot name="description">{{ description ?? t.description }}</slot></NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div role="status" :aria-label="t.users(value)" class="text-display text-foreground tabular-nums" data-slot="realtime-value">
          <NqNum :value="value" />
        </div>
        <NqMiniBar v-if="perMinute?.length" :data="perMinute" :highlight="perMinute.length - 1" :label="t.perMinute" class="h-12 w-40" />
      </div>
      <p v-if="updatedAt !== undefined" class="text-caption text-muted-foreground">{{ t.updated }} <NqDateTime :value="updatedAt" relative /></p>
      <p v-if="value === 0 && !sections?.some((s) => s.rows.length)" class="text-body-sm text-muted-foreground">{{ t.empty }}</p>
      <div v-if="sections?.length" class="grid gap-4 sm:grid-cols-2">
        <section v-for="s in sections" :key="s.id" :aria-label="s.title" class="flex flex-col gap-2">
          <h4 class="text-label text-muted-foreground">{{ s.title }}</h4>
          <ul class="flex flex-col gap-1.5">
            <li v-for="r in s.rows" :key="r.id" class="flex items-center justify-between gap-3 text-body-sm">
              <bdi v-if="s.ltr" dir="ltr" class="min-w-0 truncate text-foreground">
                <slot name="row-label" :row="r" :section="s">{{ r.label }}</slot>
              </bdi>
              <span v-else class="min-w-0 truncate text-foreground" dir="auto">
                <slot name="row-label" :row="r" :section="s">{{ r.label }}</slot>
              </span>
              <NqNum :value="r.value" class="text-muted-foreground" />
            </li>
          </ul>
        </section>
      </div>
    </NqCardContent>
  </NqCard>
</template>
