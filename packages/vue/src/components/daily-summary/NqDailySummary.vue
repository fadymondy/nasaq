<script setup lang="ts">
import { BedDouble, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Coffee, Droplets, Flame, Footprints, Heart, Laptop, Moon, Scale, Smartphone, Timer, Utensils, Watch } from "lucide-vue-next";
import { computed, useId, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqHealthDuration, NqHealthMeasure } from "../engine-card";
import { parseCivilDate, type HealthDateInput } from "../engine-card/health-engines";
import { customUnitLabel, formatHealthDate, formatMeasure, useHealthLabels } from "../engine-card/health-format";
import { NqMeter } from "../progress";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqStatus } from "../status";
import NqDailySummaryTally, { type TallyRow } from "./NqDailySummaryTally.vue";
import NqDailySummaryTile from "./NqDailySummaryTile.vue";
import { addCivilDays, isAfter, minutesToSeconds, unclassifiedCount } from "./math";
import { STRINGS, type DailySummaryLabels } from "./strings";

// A day at a glance: water, meals by safety, caffeine by kind, focus sessions, shutdown violations, steps, sleep,
// energy, resting heart rate and weight, with a switcher to move between days. Counts stay counts, units keep their
// order in Arabic, and a figure the device did not send is "Not synced", never zero.
export type SummarySource = "ios" | "android" | "watch" | "wearos" | "web";

/** One day's rollup, one row per person per day. Every figure is optional: a device that did not report it leaves it out. */
export interface DailySummaryData {
  /** Civil date, `YYYY-MM-DD`. */
  date: string;
  waterMl?: number;
  meals?: { total: number; safe: number; unsafe: number };
  /** Caffeine-bearing drinks, counted, never measured. */
  caffeine?: { total: number; sugar: number; clean: number };
  pomodorosCompleted?: number;
  shutdownViolations?: number;
  steps?: number;
  sleepMinutes?: number;
  activeEnergyKcal?: number;
  restingHeartRate?: number;
  weightKg?: number;
  source?: SummarySource;
  syncedAt?: HealthDateInput;
}

interface Props {
  summary?: DailySummaryData;
  /** The day shown when `summary` is absent (loading, error or empty). `YYYY-MM-DD`. */
  date?: string;
  /** The last day the next button can reach. Default: no limit. */
  maxDate?: string;
  /** Called with the neighbouring civil date. Omit to hide the day switcher. */
  onDateChange?: (date: string) => void;
  /** The person's own daily water goal in millilitres. Absent means no goal is drawn. */
  waterGoalMl?: number;
  loading?: boolean;
  /** The server's message when the day could not be loaded. */
  error?: string;
  onRetry?: () => void;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<DailySummaryLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { summary: undefined, date: undefined, maxDate: undefined, onDateChange: undefined, waterGoalMl: undefined, loading: false, error: undefined, onRetry: undefined, labels: undefined });

const { t, locale, ar } = useHealthLabels(STRINGS, () => props.labels);
const headingId = useId();
const day = computed(() => props.summary?.date ?? props.date);
const canNext = computed(() => (day.value ? !(props.maxDate && isAfter(addCivilDays(day.value, 1), props.maxDate)) : false));
const heading = computed(() => (day.value ? formatHealthDate(locale.value).date(parseCivilDate(day.value), { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""));
const SOURCE_ICON: Record<SummarySource, Component> = { ios: Smartphone, android: Smartphone, watch: Watch, wearos: Watch, web: Laptop };
const SourceIcon = computed(() => (props.summary?.source ? SOURCE_ICON[props.summary.source] : null));

const isEmpty = computed(() => {
  const s = props.summary;
  if (!s) return true;
  return [s.waterMl, s.meals, s.caffeine, s.pomodorosCompleted, s.shutdownViolations, s.steps, s.sleepMinutes, s.activeEnergyKcal, s.restingHeartRate, s.weightKg].every((x) => x === undefined);
});

const waterGoalText = computed(() => (props.waterGoalMl ? formatMeasure(props.waterGoalMl, "milliliter", locale.value, {}, customUnitLabel(ar.value, "milliliter")) : ""));
const mealRows = computed<TallyRow[]>(() => {
  const m = props.summary?.meals;
  if (!m) return [];
  const rest = unclassifiedCount(m.total, m.safe, m.unsafe);
  return [
    { key: "safe", tone: "success", icon: CircleCheck, label: t.value.safe, count: m.safe },
    { key: "unsafe", tone: "warning", icon: CircleAlert, label: t.value.unsafe, count: m.unsafe },
    ...(rest > 0 ? [{ key: "un", tone: "neutral" as const, icon: undefined, label: t.value.unclassified, count: rest }] : []),
  ];
});
const caffeineRows = computed<TallyRow[]>(() => {
  const c = props.summary?.caffeine;
  if (!c) return [];
  return [
    { key: "clean", tone: "success", icon: CircleCheck, label: t.value.clean, count: c.clean },
    { key: "sugar", tone: "warning", icon: CircleAlert, label: t.value.sugar, count: c.sugar },
  ];
});
</script>

<template>
  <section data-slot="daily-summary" :data-date="day" :aria-labelledby="day ? headingId : undefined" :class="cn('flex flex-col gap-6', props.class)">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <NqButton v-if="onDateChange && day" variant="secondary" size="icon" :aria-label="t.previous" @click="onDateChange(addCivilDays(day, -1))">
          <ChevronLeft aria-hidden="true" class="rtl:-scale-x-100" />
        </NqButton>
        <h2 :id="headingId" class="min-w-0 text-h3 text-foreground">{{ heading }}</h2>
        <NqButton v-if="onDateChange && day" variant="secondary" size="icon" :aria-label="t.next" :disabled="!canNext" @click="onDateChange(addCivilDays(day, 1))">
          <ChevronRight aria-hidden="true" class="rtl:-scale-x-100" />
        </NqButton>
      </div>
      <NqBadge v-if="summary?.source && SourceIcon" variant="outline">
        <component :is="SourceIcon" aria-hidden="true" />
        <span class="sr-only">{{ t.source }}: </span>
        {{ t.sources[summary.source] ?? summary.source }}
      </NqBadge>
    </header>

    <div v-if="loading" aria-busy="true" class="flex flex-col gap-3">
      <NqStatGrid>
        <NqSkeleton v-for="i in 6" :key="i" class="h-24" />
      </NqStatGrid>
    </div>
    <NqErrorState v-else-if="error" :title="t.loadError" :description="error">
      <template v-if="onRetry" #actions>
        <NqButton variant="secondary" size="sm" @click="onRetry()">{{ t.retry }}</NqButton>
      </template>
    </NqErrorState>
    <NqEmptyState v-else-if="isEmpty" :title="t.empty" :description="t.emptyHint" />
    <template v-else-if="summary">
      <section :aria-label="t.protocol" class="flex flex-col gap-3">
        <h3 class="text-label text-muted-foreground">{{ t.protocol }}</h3>
        <NqStatGrid>
          <NqCard data-slot="daily-summary-water" class="gap-3 px-4 py-4">
            <NqDailySummaryTile>
              <template #icon><Droplets /></template>
              {{ t.water }}
            </NqDailySummaryTile>
            <div class="text-h2 leading-tight text-foreground tabular-nums">
              <NqHealthMeasure v-if="summary.waterMl !== undefined" :value="summary.waterMl" unit="milliliter" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notSynced }}</span>
            </div>
            <NqMeter
              v-if="summary.waterMl !== undefined && waterGoalMl"
              :label="t.goalLabel"
              :value="summary.waterMl"
              :max="waterGoalMl"
              :tone="summary.waterMl >= waterGoalMl ? 'success' : 'default'"
              :value-text="waterGoalText"
              show-value
            />
          </NqCard>
          <NqDailySummaryTally :icon="Utensils" :label="t.meals" :total="summary.meals ? t.mealsN(summary.meals.total) : undefined" :missing="t.notSynced" :rows="mealRows" />
          <NqDailySummaryTally :icon="Coffee" :label="t.caffeine" :total="summary.caffeine ? t.drinksN(summary.caffeine.total) : undefined" :missing="t.notSynced" :rows="caffeineRows" />
          <NqCard data-slot="daily-summary-shutdown" class="gap-3 px-4 py-4">
            <NqDailySummaryTile>
              <template #icon><Moon /></template>
              {{ t.shutdown }}
            </NqDailySummaryTile>
            <div class="flex flex-col gap-1">
              <div class="text-h2 leading-tight text-foreground tabular-nums">
                <NqHealthMeasure v-if="summary.shutdownViolations !== undefined" :value="summary.shutdownViolations" unit="level" :format="{ maximumFractionDigits: 0 }" />
                <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notSynced }}</span>
              </div>
              <NqStatus v-if="summary.shutdownViolations !== undefined" :tone="summary.shutdownViolations === 0 ? 'success' : 'warning'" :icon="summary.shutdownViolations === 0 ? CircleCheck : CircleAlert">
                {{ summary.shutdownViolations === 0 ? t.none : t.violationsN(summary.shutdownViolations) }}
              </NqStatus>
            </div>
          </NqCard>
          <NqStatCard :label="t.pomodoros">
            <template #icon><Timer /></template>
            <template #value>
              <NqHealthMeasure v-if="summary.pomodorosCompleted !== undefined" :value="summary.pomodorosCompleted" unit="level" :format="{ maximumFractionDigits: 0 }" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notSynced }}</span>
            </template>
          </NqStatCard>
        </NqStatGrid>
      </section>

      <section :aria-label="t.body" class="flex flex-col gap-3">
        <h3 class="text-label text-muted-foreground">{{ t.body }}</h3>
        <NqStatGrid>
          <NqStatCard :label="t.steps">
            <template #icon><Footprints /></template>
            <template #value>
              <NqHealthMeasure v-if="summary.steps !== undefined" :value="summary.steps" unit="steps" :format="{ maximumFractionDigits: 0 }" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notSynced }}</span>
            </template>
          </NqStatCard>
          <NqStatCard :label="t.sleep">
            <template #icon><BedDouble /></template>
            <template #value>
              <NqHealthDuration v-if="summary.sleepMinutes !== undefined" :seconds="minutesToSeconds(summary.sleepMinutes)" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notSynced }}</span>
            </template>
          </NqStatCard>
          <NqStatCard :label="t.activeEnergy">
            <template #icon><Flame /></template>
            <template #value>
              <NqHealthMeasure v-if="summary.activeEnergyKcal !== undefined" :value="summary.activeEnergyKcal" unit="kcal" :format="{ maximumFractionDigits: 0 }" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notSynced }}</span>
            </template>
          </NqStatCard>
          <NqStatCard :label="t.restingHeartRate">
            <template #icon><Heart /></template>
            <template #value>
              <NqHealthMeasure v-if="summary.restingHeartRate !== undefined" :value="summary.restingHeartRate" unit="bpm" :format="{ maximumFractionDigits: 0 }" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notSynced }}</span>
            </template>
          </NqStatCard>
          <NqStatCard :label="t.weight">
            <template #icon><Scale /></template>
            <template #value>
              <NqHealthMeasure v-if="summary.weightKg !== undefined" :value="summary.weightKg" unit="kilogram" :format="{ maximumFractionDigits: 1 }" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notSynced }}</span>
            </template>
          </NqStatCard>
        </NqStatGrid>
      </section>
    </template>
  </section>
</template>
