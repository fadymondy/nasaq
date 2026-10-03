<script setup lang="ts">
import { BedDouble, Download, Droplets, Footprints, Heart, Scale } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import type { ChartConfig } from "../chart";
import { ENGINE_ICONS, NqHealthDuration, NqHealthMeasure, type HealthActionResult } from "../engine-card";
import { parseCivilDate, summariseDays, type EngineId, type HistoryDay } from "../engine-card/health-engines";
import { formatHealthDate, useHealthLabels } from "../engine-card/health-format";
import NqEngineHistoryChart, { type ChartBar } from "../engine-details/NqEngineHistoryChart.vue";
import { NqSectionHeader } from "../section-header";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { metricSeries, summariseReport, type ReportDay, type ReportMetric } from "./math";
import NqReportLineChart from "./NqReportLineChart.vue";
import { STRINGS, type HealthReportLabels } from "./strings";

// Health reports over a period: averages that skip missing days, a chart of one figure at a time, meals and caffeine per day, and each
// engine's days on and off protocol with streaks. Counts and verdicts, never a score.

/** One engine's day verdicts over the report period, oldest first. */
export interface EngineReport {
  engine: EngineId;
  days: readonly HistoryDay[];
}

interface Props {
  /** One rollup per day, oldest first. Figures a device did not send are left out. */
  days: readonly ReportDay[];
  /** Per-engine verdicts for the same period. Only hydration, caffeine and GERD judge days. */
  engines?: readonly EngineReport[];
  /** Periods offered, in days. Default `[7, 30, 90]`. */
  periods?: readonly number[];
  /** The applied period. Controlled; omit to let the component keep it. */
  period?: number;
  /** Called when a period is chosen. Load it and pass the new `days` back. */
  onPeriodChange?: (days: number) => void;
  /** Export the report. Resolve with `{ error }` to show the server's message. Omit to hide the button. */
  onExport?: () => Promise<HealthActionResult>;
  loading?: boolean;
  /** The server's message when the report could not be loaded. */
  error?: string;
  onRetry?: () => void;
  labels?: Partial<HealthReportLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  engines: undefined,
  periods: () => [7, 30, 90],
  period: undefined,
  onPeriodChange: undefined,
  onExport: undefined,
  loading: false,
  error: undefined,
  onRetry: undefined,
  labels: undefined,
});

const { t, locale } = useHealthLabels(STRINGS, () => props.labels);
const headingId = useId();
const ownPeriod = ref(props.periods[0] ?? 30);
const active = computed(() => props.period ?? ownPeriod.value);
const exporting = ref(false);
const exportError = ref<string>();
const summary = computed(() => summariseReport(props.days));
const empty = computed(() => props.days.length === 0 || summary.value.daysWithData === 0);

function onPeriod(v: string[]) {
  const next = Number(v[0]);
  if (!next) return;
  ownPeriod.value = next;
  props.onPeriodChange?.(next);
}
async function runExport() {
  if (!props.onExport) return;
  exporting.value = true;
  exportError.value = undefined;
  try {
    const result = await props.onExport();
    if (result && result.error) exportError.value = result.error;
  } catch {
    exportError.value = t.value.exportFailed;
  } finally {
    exporting.value = false;
  }
}

const METRICS = [
  { key: "waterMl", icon: Droplets },
  { key: "steps", icon: Footprints },
  { key: "sleepMinutes", icon: BedDouble },
  { key: "weightKg", icon: Scale },
  { key: "restingHeartRate", icon: Heart },
] as const;
const metric = ref<ReportMetric>("waterMl");
function onMetric(v: string[]) {
  if (v[0]) metric.value = v[0] as ReportMetric;
}

const label = (date: string) => formatHealthDate(locale.value).date(parseCivilDate(date), { day: "numeric", month: "short" });
const series = computed(() => metricSeries(props.days, metric.value));
const hasSeries = computed(() => series.value.some((p) => p.value !== null));
const trendConfig = computed<ChartConfig>(() => ({ value: { label: t.value.metrics[metric.value], color: "var(--primary)" } }));
const trendBars = computed<ChartBar[]>(() => series.value.map((p) => ({ label: label(p.date), values: { value: p.value ?? 0 } })));
const trendPoints = computed(() => series.value.map((p) => ({ label: label(p.date), value: p.value })));
const isLine = computed(() => metric.value === "weightKg" || metric.value === "restingHeartRate");

const mealsConfig = computed<ChartConfig>(() => ({ safe: { label: t.value.safe, color: "var(--nq-success)" }, unsafe: { label: t.value.unsafe, color: "var(--nq-warning)" } }));
const caffeineConfig = computed<ChartConfig>(() => ({ clean: { label: t.value.clean, color: "var(--nq-success)" }, sugar: { label: t.value.sugar, color: "var(--nq-warning)" } }));
const mealBars = computed<ChartBar[]>(() => props.days.map((d) => ({ label: label(d.date), values: { safe: d.meals?.safe ?? 0, unsafe: d.meals?.unsafe ?? 0 } })));
const caffeineBars = computed<ChartBar[]>(() => props.days.map((d) => ({ label: label(d.date), values: { clean: d.caffeine?.clean ?? 0, sugar: d.caffeine?.sugar ?? 0 } })));
const hasMeals = computed(() => props.days.some((d) => d.meals));
const hasCaffeine = computed(() => props.days.some((d) => d.caffeine));
const judged = computed(() => (props.engines ?? []).filter((e) => e.days.length > 0).map((e) => ({ engine: e.engine, totals: summariseDays(e.days) })));
</script>

<template>
  <div data-slot="health-report" role="region" :aria-labelledby="headingId" :class="cn('flex flex-col gap-6', props.class)">
    <header class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <h1 :id="headingId" class="text-h1 text-foreground">{{ t.title }}</h1>
          <p class="max-w-prose text-pretty text-body text-muted-foreground">{{ t.lede }}</p>
        </div>
        <NqButton v-if="onExport" variant="secondary" :loading="exporting" :disabled="loading || days.length === 0" @click="runExport">
          <Download aria-hidden="true" />
          {{ exporting ? t.exporting : t.export }}
        </NqButton>
      </div>
      <p v-if="exportError" role="alert" class="text-body-sm text-nq-danger-text">{{ exportError }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-label text-muted-foreground">{{ t.period }}</span>
        <NqToggleGroup :aria-label="t.period" :model-value="[String(active)]" @update:model-value="onPeriod">
          <NqToggle v-for="n in periods" :key="n" :value="String(n)">{{ t.periodOption(n) }}</NqToggle>
        </NqToggleGroup>
      </div>
    </header>

    <div v-if="loading" aria-busy="true" class="flex flex-col gap-4">
      <NqStatGrid>
        <NqSkeleton v-for="i in 5" :key="i" class="h-24" />
      </NqStatGrid>
      <NqSkeleton class="h-64" />
    </div>
    <NqErrorState v-else-if="error" :title="t.loadError" :description="error">
      <template v-if="onRetry" #actions>
        <NqButton variant="secondary" size="sm" @click="onRetry()">{{ t.retry }}</NqButton>
      </template>
    </NqErrorState>
    <NqEmptyState v-else-if="empty" :title="t.empty" :description="t.emptyHint" />
    <div v-else class="flex flex-col gap-8">
      <section :aria-labelledby="`${headingId}-avg`" class="flex flex-col gap-4">
        <NqSectionHeader as="h2" :heading-id="`${headingId}-avg`" :title="t.averages" :description="t.averagesDescription(summary.daysWithData)" />
        <NqStatGrid>
          <NqStatCard :label="t.avgWater">
            <template #icon><Droplets /></template>
            <template #value>
              <NqHealthMeasure v-if="summary.averages.waterMl !== null" :value="summary.averages.waterMl" unit="milliliter" :format="{ maximumFractionDigits: 0 }" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notEnough }}</span>
            </template>
          </NqStatCard>
          <NqStatCard :label="t.avgSteps">
            <template #icon><Footprints /></template>
            <template #value>
              <NqHealthMeasure v-if="summary.averages.steps !== null" :value="summary.averages.steps" unit="steps" :format="{ maximumFractionDigits: 0 }" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notEnough }}</span>
            </template>
          </NqStatCard>
          <NqStatCard :label="t.avgSleep">
            <template #icon><BedDouble /></template>
            <template #value>
              <NqHealthDuration v-if="summary.averages.sleepMinutes !== null" :seconds="Math.round(summary.averages.sleepMinutes * 60)" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notEnough }}</span>
            </template>
          </NqStatCard>
          <NqStatCard :label="t.avgHeartRate">
            <template #icon><Heart /></template>
            <template #value>
              <NqHealthMeasure v-if="summary.averages.restingHeartRate !== null" :value="summary.averages.restingHeartRate" unit="bpm" :format="{ maximumFractionDigits: 0 }" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notEnough }}</span>
            </template>
          </NqStatCard>
          <NqStatCard :label="t.weightChange">
            <template #icon><Scale /></template>
            <template #value>
              <NqHealthMeasure v-if="summary.weight" :value="summary.weight.change" unit="kilogram" :format="{ maximumFractionDigits: 1, signDisplay: 'exceptZero' }" />
              <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notEnough }}</span>
            </template>
          </NqStatCard>
          <NqStatCard :label="t.shutdownDays">
            <template #value><NqHealthMeasure :value="summary.daysWithShutdownViolations" unit="day" :format="{ unitDisplay: 'long' }" /></template>
          </NqStatCard>
        </NqStatGrid>
      </section>

      <section :aria-labelledby="`${headingId}-trend`" class="flex flex-col gap-4">
        <NqSectionHeader as="h2" :heading-id="`${headingId}-trend`" :title="t.trend" />
        <div class="overflow-x-auto pb-1">
          <NqToggleGroup :aria-label="t.metricPicker" :model-value="[metric]" @update:model-value="onMetric">
            <NqToggle v-for="m in METRICS" :key="m.key" :value="m.key">
              <component :is="m.icon" aria-hidden="true" />
              {{ t.metrics[m.key] }}
            </NqToggle>
          </NqToggleGroup>
        </div>
        <NqCard>
          <NqCardContent>
            <template v-if="hasSeries">
              <NqReportLineChart v-if="isLine" :config="trendConfig" :points="trendPoints" :label="t.trendSummary(t.metrics[metric], days.length)" />
              <NqEngineHistoryChart v-else :config="trendConfig" :bars="trendBars" :label="t.trendSummary(t.metrics[metric], days.length)" class="h-64" />
            </template>
            <p v-else class="py-10 text-center text-body-sm text-muted-foreground">{{ t.noReadings }}</p>
          </NqCardContent>
        </NqCard>
      </section>

      <section v-if="hasMeals || hasCaffeine" class="grid gap-4 lg:grid-cols-2">
        <NqCard v-if="hasMeals">
          <NqCardHeader>
            <NqCardTitle as="h3" class="text-h3">{{ t.meals }}</NqCardTitle>
            <NqCardDescription>{{ t.mealsDescription }}</NqCardDescription>
          </NqCardHeader>
          <NqCardContent><NqEngineHistoryChart stacked :config="mealsConfig" :bars="mealBars" :label="`${t.meals}, ${days.length}`" /></NqCardContent>
        </NqCard>
        <NqCard v-if="hasCaffeine">
          <NqCardHeader>
            <NqCardTitle as="h3" class="text-h3">{{ t.caffeine }}</NqCardTitle>
            <NqCardDescription>{{ t.caffeineDescription }}</NqCardDescription>
          </NqCardHeader>
          <NqCardContent><NqEngineHistoryChart stacked :config="caffeineConfig" :bars="caffeineBars" :label="`${t.caffeine}, ${days.length}`" /></NqCardContent>
        </NqCard>
      </section>

      <section v-if="judged.length > 0" :aria-labelledby="`${headingId}-adh`" class="flex flex-col gap-4">
        <NqSectionHeader as="h2" :heading-id="`${headingId}-adh`" :title="t.adherence" :description="t.adherenceDescription" />
        <NqCard>
          <NqCardContent>
            <NqTable :label="t.tableCaption">
              <NqTableHeader>
                <NqTableRow>
                  <NqTableHead>{{ t.engine }}</NqTableHead>
                  <NqTableHead>{{ t.onProtocol }}</NqTableHead>
                  <NqTableHead>{{ t.offProtocol }}</NqTableHead>
                  <NqTableHead>{{ t.notJudged }}</NqTableHead>
                  <NqTableHead>{{ t.currentStreak }}</NqTableHead>
                  <NqTableHead>{{ t.bestStreak }}</NqTableHead>
                </NqTableRow>
              </NqTableHeader>
              <NqTableBody>
                <NqTableRow v-for="e in judged" :key="e.engine" :data-engine="e.engine">
                  <NqTableCell>
                    <span class="inline-flex items-center gap-2 font-medium">
                      <component :is="ENGINE_ICONS[e.engine]" aria-hidden="true" class="size-4 text-muted-foreground" />
                      {{ t.engines[e.engine].title }}
                    </span>
                  </NqTableCell>
                  <NqTableCell><NqHealthMeasure :value="e.totals.daysOnProtocol" unit="day" :format="{ unitDisplay: 'long' }" /></NqTableCell>
                  <NqTableCell><NqHealthMeasure :value="e.totals.daysOffProtocol" unit="day" :format="{ unitDisplay: 'long' }" /></NqTableCell>
                  <NqTableCell><NqHealthMeasure :value="e.totals.daysUnevaluated" unit="day" :format="{ unitDisplay: 'long' }" /></NqTableCell>
                  <NqTableCell><NqHealthMeasure :value="e.totals.currentStreak" unit="day" :format="{ unitDisplay: 'long' }" /></NqTableCell>
                  <NqTableCell><NqHealthMeasure :value="e.totals.bestStreak" unit="day" :format="{ unitDisplay: 'long' }" /></NqTableCell>
                </NqTableRow>
              </NqTableBody>
            </NqTable>
          </NqCardContent>
        </NqCard>
      </section>
    </div>
  </div>
</template>
