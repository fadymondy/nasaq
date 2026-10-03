<script setup lang="ts">
import { ChevronLeft, CircleAlert, CircleCheck, CircleDashed, CircleMinus, CircleX, Flame, Route } from "lucide-vue-next";
import { computed, ref, useId, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { buttonVariants } from "../button/variants";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import type { ChartConfig } from "../chart";
import { ENGINE_ICONS, NqEngineCard, NqHealthMeasure, type HealthActionResult } from "../engine-card";
import {
  ENGINE_PROTOCOL,
  bucketDays,
  judgesDays,
  parseCivilDate,
  summariseDays,
  type EngineAction,
  type EngineSnapshot,
  type HealthDateInput,
  type HistoryDay,
} from "../engine-card/health-engines";
import { formatHealthDate, formatMeasure, useHealthLabels, type MeasureUnit } from "../engine-card/health-format";
import { NqSectionHeader } from "../section-header";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import { NqStatCard, NqStatGrid } from "../stat-card";
import type { StatusTone } from "../status";
import { NqTimeline, NqTimelineItem } from "../timeline";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqEngineHistoryChart, { type ChartBar } from "./NqEngineHistoryChart.vue";
import NqEngineHistoryLegend from "./NqEngineHistoryLegend.vue";
import NqEngineHistoryStrip from "./NqEngineHistoryStrip.vue";
import { STRINGS, type EngineDetailsLabels } from "./strings";

// One engine's own page: its live card, its per-day history (with counts, streaks and a chart) for the engines that judge
// days, its record as a timeline, and the fixed protocol it follows. Counts and verdicts only, never a rate.

/** One line in the engine's record. */
export interface EngineRecordEntry {
  id: string;
  at: HealthDateInput;
  /** What happened, in the person's language. */
  title: string;
  detail?: string;
  /** Default "neutral". Drives the marker's icon as well as its colour. */
  tone?: StatusTone;
}

interface Props {
  /** The engine's live state, shown by the same card as the dashboard. */
  snapshot: EngineSnapshot;
  /** Fixed "now" for countdowns. Omit to follow the clock. */
  now?: HealthDateInput;
  /** Called by the live card's log actions. Resolve with `{ error }` to show the server's message. */
  onAction?: (action: EngineAction) => Promise<HealthActionResult>;
  /** Day verdicts, oldest first, one per calendar day. Only the engines that judge days (hydration, caffeine, GERD) use it. */
  history?: readonly HistoryDay[];
  historyLoading?: boolean;
  /** Shown instead of the history when it could not be loaded. Use the server's own message. */
  historyError?: string;
  /** Windows offered, in days. Default `[7, 30, 365]`. */
  windows?: readonly number[];
  /** The applied window, in days. Controlled; omit to let the component keep it. */
  windowDays?: number;
  /** Called when a window is chosen. Load that window and pass it back through `history`. */
  onWindowChange?: (days: number) => Promise<HealthActionResult> | void;
  /** Try again after `historyError`. */
  onRetry?: () => void;
  /** What the engine has written down, newest first. Every engine has one. */
  records?: readonly EngineRecordEntry[];
  /** Where "back" goes. Omit to hide the link. */
  backHref?: string;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<EngineDetailsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  now: undefined,
  onAction: undefined,
  history: undefined,
  historyLoading: false,
  historyError: undefined,
  windows: () => [7, 30, 365],
  windowDays: undefined,
  onWindowChange: undefined,
  onRetry: undefined,
  records: undefined,
  backHref: undefined,
  labels: undefined,
});

const { t, locale } = useHealthLabels(STRINGS, () => props.labels);
const headingId = useId();
const engine = computed(() => props.snapshot.engine);
const meta = computed(() => t.value.engines[engine.value]);
const Icon = computed(() => ENGINE_ICONS[engine.value]);

const ownWindow = ref(props.windows[0] ?? 30);
const active = computed(() => props.windowDays ?? props.history?.length ?? ownWindow.value);
function choose(days: number) {
  ownWindow.value = days;
  void props.onWindowChange?.(days);
}
function onToggle(v: string[]) {
  if (v[0]) choose(Number(v[0]));
}

const TONE_MARK: Record<StatusTone, { icon: Component; text: string }> = {
  neutral: { icon: CircleMinus, text: "text-muted-foreground" },
  info: { icon: CircleDashed, text: "text-nq-info-text" },
  success: { icon: CircleCheck, text: "text-nq-success-text" },
  warning: { icon: CircleAlert, text: "text-nq-warning-text" },
  danger: { icon: CircleX, text: "text-nq-danger-text" },
};

// History body: counts, streaks, a daily or weekly chart and the day strip.
const days = computed(() => props.history ?? []);
const totals = computed(() => summariseDays(days.value));
const daily = computed(() => days.value.length <= 31);
const weekly = computed(() => (days.value.length ? bucketDays(days.value) : []));
const dateLabel = (date: string) => formatHealthDate(locale.value).date(parseCivilDate(date), { day: "numeric", month: "short" });
const dailyConfig = computed<ChartConfig>(() => ({ entries: { label: t.value.entries, color: "var(--primary)" } }));
const weeklyConfig = computed<ChartConfig>(() => ({
  onProtocol: { label: t.value.verdicts.on_protocol, color: "var(--nq-success)" },
  offProtocol: { label: t.value.verdicts.off_protocol, color: "var(--nq-danger)" },
  unevaluated: { label: t.value.verdicts.unevaluated, color: "var(--nq-line)" },
}));
const dailyBars = computed<ChartBar[]>(() => days.value.map((d) => ({ label: dateLabel(d.date), values: { entries: d.entries } })));
const weeklyBars = computed<ChartBar[]>(() => weekly.value.map((w) => ({ label: dateLabel(w.start), values: { onProtocol: w.onProtocol, offProtocol: w.offProtocol, unevaluated: w.unevaluated } })));

// The fixed protocol rows: a measure, or plain text.
interface Row {
  label: string;
  measure?: { value: number; unit: MeasureUnit; long?: boolean };
  text?: string;
}
const rows = computed<Row[]>(() => {
  const P = ENGINE_PROTOCOL;
  const long = (value: number) => formatMeasure(value, "day", locale.value, { unitDisplay: "long" });
  const T = t.value;
  switch (engine.value) {
    case "hydration":
      return [
        { label: T.unit, measure: { value: P.hydration.unitMl, unit: "milliliter" } },
        { label: T.dailyCap, measure: { value: P.hydration.dailyCapMl, unit: "milliliter" } },
        { label: T.cooldown, measure: { value: P.hydration.cooldownSeconds, unit: "second", long: true } },
      ];
    case "caffeine":
      return [{ label: T.blockAfterWake, measure: { value: P.caffeine.blockMinutes, unit: "minute", long: true } }];
    case "gerd":
      return [
        { label: T.windowBeforeSleep, measure: { value: P.gerd.windowHours, unit: "hour", long: true } },
        { label: T.allowedInside, text: P.gerd.whitelist.map((item) => T.whitelist[item] ?? item).join(" · ") },
      ];
    case "medication":
      return [{ label: T.graceWindow, measure: { value: P.medication.graceMinutes, unit: "minute", long: true } }];
    case "triggers":
      return [{ label: T.familiesLabel, text: P.triggers.families.map((f) => T.families[f] ?? f).join(" · ") }];
    case "cycle":
      return [
        { label: T.minCycles, measure: { value: P.cycle.minCycles, unit: "cycles" } },
        { label: T.irregularSpread, measure: { value: P.cycle.irregularSpreadDays, unit: "day", long: true } },
        { label: T.ovulationBefore, measure: { value: P.cycle.ovulationBeforeNextStartDays, unit: "day", long: true } },
        { label: T.fertileWindow, text: T.fertileWindowValue(long(P.cycle.fertileOpensBeforeOvulationDays), long(P.cycle.fertileClosesAfterOvulationDays)) },
      ];
    case "contraceptive":
      return [{ label: T.methodsLabel, text: P.contraceptive.methods.map((m) => T.methods[m] ?? m).join(" · ") }];
  }
  return [];
});
</script>

<template>
  <div data-slot="engine-details" :data-engine="engine" :class="cn('mx-auto flex w-full max-w-4xl flex-col gap-8', props.class)">
    <header class="flex flex-col gap-4">
      <a v-if="backHref" :href="backHref" data-slot="engine-details-back" :class="cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ms-2.5 w-fit')">
        <ChevronLeft aria-hidden="true" class="rtl:-scale-x-100" />
        {{ t.back }}
      </a>
      <div class="flex items-center gap-4">
        <span aria-hidden="true" class="grid size-14 shrink-0 place-items-center rounded-card bg-secondary text-muted-foreground [&_svg]:size-7">
          <component :is="Icon" />
        </span>
        <div class="flex min-w-0 flex-col gap-1">
          <h1 :id="headingId" class="text-h1 text-foreground">{{ meta.title }}</h1>
          <p class="text-pretty text-body text-muted-foreground">{{ t.lede }}</p>
        </div>
      </div>
    </header>

    <NqEngineCard :snapshot="snapshot" :now="now" :on-action="onAction" hide-title heading-as="h2" />

    <section v-if="judgesDays(engine)" :aria-labelledby="`${headingId}-history`" class="flex flex-col gap-4">
      <NqSectionHeader :heading-id="`${headingId}-history`" :title="t.history" :description="t.historyDescription">
        <template #action>
          <NqToggleGroup :aria-label="t.windowLabel" :model-value="[String(active)]" @update:model-value="onToggle">
            <NqToggle v-for="d in windows" :key="d" :value="String(d)">{{ t.windowOption(d) }}</NqToggle>
          </NqToggleGroup>
        </template>
      </NqSectionHeader>

      <div v-if="historyLoading" aria-busy="true" data-slot="engine-details-history-skeleton" class="flex flex-col gap-3">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <NqSkeleton v-for="i in 5" :key="i" class="h-20" />
        </div>
        <NqSkeleton class="h-48" />
      </div>
      <NqErrorState v-else-if="historyError" :title="t.loadError" :description="historyError">
        <template v-if="onRetry" #actions>
          <NqButton variant="secondary" size="sm" @click="onRetry()">{{ t.retry }}</NqButton>
        </template>
      </NqErrorState>
      <NqEmptyState v-else-if="!history || history.length === 0" :icon="Route" :title="t.noHistory" :description="t.noHistoryHint" />
      <div v-else class="flex flex-col gap-4">
        <NqStatGrid>
          <NqStatCard :label="t.onProtocol">
            <template #icon><CircleCheck /></template>
            <template #value><NqHealthMeasure :value="totals.daysOnProtocol" unit="day" :format="{ unitDisplay: 'long' }" /></template>
          </NqStatCard>
          <NqStatCard :label="t.offProtocol">
            <template #icon><CircleX /></template>
            <template #value><NqHealthMeasure :value="totals.daysOffProtocol" unit="day" :format="{ unitDisplay: 'long' }" /></template>
          </NqStatCard>
          <NqStatCard :label="t.unevaluated">
            <template #icon><CircleDashed /></template>
            <template #value><NqHealthMeasure :value="totals.daysUnevaluated" unit="day" :format="{ unitDisplay: 'long' }" /></template>
          </NqStatCard>
          <NqStatCard :label="t.currentStreak">
            <template #value><NqHealthMeasure :value="totals.currentStreak" unit="day" :format="{ unitDisplay: 'long' }" /></template>
          </NqStatCard>
          <NqStatCard :label="t.bestStreak">
            <template #value><NqHealthMeasure :value="totals.bestStreak" unit="day" :format="{ unitDisplay: 'long' }" /></template>
          </NqStatCard>
        </NqStatGrid>

        <NqCard>
          <NqCardHeader>
            <NqCardTitle as="h3" class="text-h3">{{ daily ? t.entriesChart : t.weeklyChart }}</NqCardTitle>
            <NqCardDescription>{{ t.chartSummary(days.length) }}</NqCardDescription>
          </NqCardHeader>
          <NqCardContent class="flex flex-col gap-4">
            <NqEngineHistoryChart v-if="daily" :config="dailyConfig" :bars="dailyBars" :label="`${t.entriesChart}. ${t.chartSummary(days.length)}`" />
            <NqEngineHistoryChart v-else stacked :config="weeklyConfig" :bars="weeklyBars" :label="`${t.weeklyChart}. ${t.chartSummary(days.length)}`" class="h-56" />
            <div class="flex flex-col gap-2">
              <span class="text-label text-foreground">{{ t.strip }}</span>
              <NqEngineHistoryStrip :days="days" />
              <NqEngineHistoryLegend />
            </div>
          </NqCardContent>
        </NqCard>
      </div>
    </section>
    <NqEmptyState v-else :icon="Flame" :title="t.noLedger" :description="t.noLedgerHint" class="py-8" />

    <section :aria-labelledby="`${headingId}-record`" class="flex flex-col gap-4">
      <NqSectionHeader :heading-id="`${headingId}-record`" :title="t.record" :description="t.recordDescription" />
      <NqCard v-if="records && records.length > 0">
        <NqCardContent>
          <NqTimeline>
            <NqTimelineItem v-for="entry in records" :key="entry.id" :title="entry.title" :description="entry.detail" :time="entry.at">
              <template #icon><component :is="TONE_MARK[entry.tone ?? 'neutral'].icon" aria-hidden="true" :class="TONE_MARK[entry.tone ?? 'neutral'].text" /></template>
            </NqTimelineItem>
          </NqTimeline>
        </NqCardContent>
      </NqCard>
      <NqEmptyState v-else :title="t.noRecord" class="py-8" />
      <slot />
    </section>

    <section :aria-labelledby="`${headingId}-protocol`" class="flex flex-col gap-4">
      <NqSectionHeader :heading-id="`${headingId}-protocol`" :title="t.protocol" :description="t.protocolDescription" />
      <NqCard>
        <NqCardContent>
          <dl class="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div v-for="row in rows" :key="row.label" class="flex min-w-0 flex-col gap-0.5 border-b border-border pb-3 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
              <dt class="text-caption text-muted-foreground">{{ row.label }}</dt>
              <dd class="m-0 text-body-sm font-medium text-foreground">
                <NqHealthMeasure v-if="row.measure" :value="row.measure.value" :unit="row.measure.unit" :format="row.measure.long ? { unitDisplay: 'long' } : undefined" />
                <template v-else>{{ row.text }}</template>
              </dd>
            </div>
          </dl>
        </NqCardContent>
      </NqCard>
    </section>

    <p class="text-caption text-muted-foreground">{{ t.disclaimer }}</p>
  </div>
</template>
