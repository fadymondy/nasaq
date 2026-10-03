<script setup lang="ts">
import { Activity, CircleAlert, CircleCheck, CircleDot, CircleX, Droplet, Dumbbell, Flame, Heart, Hourglass, Scale } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqHealthMeasure } from "../engine-card";
import type { HealthDateInput } from "../engine-card/health-engines";
import { customUnitLabel, formatHealthDate, formatMeasure, useHealthLabels } from "../engine-card/health-format";
import { NqMeter } from "../progress";
import { NqSkeleton } from "../states";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqStatus } from "../status";
import { bmiCategory, bmiTone, clampPercent, computeBmi, distanceToTarget, type BmiCategory, type VitalTarget } from "./math";
import { STRINGS, type VitalsLabels } from "./strings";

// Body readings from a scale or a wearable: weight, BMI with its category, body water, visceral fat, muscle mass, metabolic age
// and resting heart rate, plus progress towards the person's targets. A missing reading says "Not measured", never zero.
export type VitalTargetKey = "weight" | "visceralFat" | "bodyWater" | "metabolicAge";

export interface VitalsData {
  weightKg?: number;
  /** With `weightKg`, lets the panel compute BMI when `bmi` is not sent. */
  heightCm?: number;
  /** As the server computed it. Wins over the panel's own computation. */
  bmi?: number;
  bodyWaterPercent?: number;
  /** The scale's visceral fat level. A bare number with no unit. */
  visceralFat?: number;
  muscleMassKg?: number;
  metabolicAge?: number;
  restingHeartRate?: number;
  measuredAt?: HealthDateInput;
  /** False until a baseline measurement is set. Targets are hidden without one. */
  hasBaseline?: boolean;
  targets?: Partial<Record<VitalTargetKey, VitalTarget>>;
  /** Recent readings, oldest first, drawn as a sparkline on the tile. */
  trends?: Partial<Record<"weight" | "restingHeartRate", readonly number[]>>;
}

interface Props {
  vitals?: VitalsData;
  loading?: boolean;
  /** Skip the heading (for use inside a page that has its own). */
  hideHeading?: boolean;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<VitalsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { vitals: undefined, loading: false, hideHeading: false, labels: undefined });

type TargetUnit = "kilogram" | "percent" | "level" | "year";
type TargetLabelKey = "weight" | "visceralFat" | "bodyWater" | "metabolicAge";
const TARGET_META: Record<VitalTargetKey, { unit: TargetUnit; label: TargetLabelKey; digits: number }> = {
  weight: { unit: "kilogram", label: "weight", digits: 1 },
  visceralFat: { unit: "level", label: "visceralFat", digits: 0 },
  bodyWater: { unit: "percent", label: "bodyWater", digits: 1 },
  metabolicAge: { unit: "year", label: "metabolicAge", digits: 0 },
};
const TARGET_KEYS = Object.keys(TARGET_META) as VitalTargetKey[];
const BMI_ICON: Record<BmiCategory, Component> = { underweight: CircleAlert, normal: CircleCheck, overweight: CircleAlert, obese: CircleX };

const { t, locale, ar } = useHealthLabels(STRINGS, () => props.labels);
const v = computed<VitalsData>(() => props.vitals ?? {});
const bmi = computed(() => v.value.bmi ?? computeBmi(v.value.weightKg, v.value.heightCm));
const category = computed(() => (bmi.value === null ? undefined : bmiCategory(bmi.value)));
const bmiVariant = computed(() => {
  const tone = category.value ? bmiTone(category.value) : "neutral";
  return tone === "info" ? "neutral" : tone;
});
const anything = computed(() => [v.value.weightKg, bmi.value, v.value.bodyWaterPercent, v.value.visceralFat, v.value.muscleMassKg, v.value.metabolicAge, v.value.restingHeartRate].some((x) => x !== undefined && x !== null));
const measuredOn = computed(() => (v.value.measuredAt ? t.value.measuredOn(formatHealthDate(locale.value).date(v.value.measuredAt, { dateStyle: "medium" })) : ""));
const hasTargets = computed(() => v.value.hasBaseline !== false && !!v.value.targets && Object.keys(v.value.targets).length > 0);

function fmt(n: number, key: VitalTargetKey): string {
  const meta = TARGET_META[key];
  return formatMeasure(n, meta.unit, locale.value, { maximumFractionDigits: meta.digits }, customUnitLabel(ar.value, meta.unit));
}
</script>

<template>
  <section v-if="loading" aria-busy="true" data-slot="vitals" :class="cn('flex flex-col gap-4', props.class)">
    <NqStatGrid>
      <NqSkeleton v-for="i in 4" :key="i" class="h-24" />
    </NqStatGrid>
  </section>
  <section v-else data-slot="vitals" :aria-label="hideHeading ? t.title : undefined" :class="cn('flex flex-col gap-4', props.class)">
    <header v-if="!hideHeading" class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="text-h3 text-foreground">{{ t.title }}</h2>
      <span v-if="v.measuredAt" class="text-caption text-muted-foreground">{{ measuredOn }}</span>
    </header>

    <p v-if="!anything" class="rounded-card border border-dashed border-border p-6 text-center text-body-sm text-muted-foreground">{{ t.empty }}</p>
    <NqStatGrid v-else>
      <NqStatCard :label="t.weight" :sparkline="v.trends?.weight" :sparkline-label="t.trendLabel(t.weight)">
        <template #icon><Scale /></template>
        <template #value>
          <NqHealthMeasure v-if="v.weightKg != null" :value="v.weightKg" unit="kilogram" :format="{ maximumFractionDigits: 1 }" />
          <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notMeasured }}</span>
        </template>
      </NqStatCard>
      <NqStatCard :label="t.bmi">
        <template #icon><Activity /></template>
        <template #value>
          <span v-if="bmi != null" class="flex flex-wrap items-center gap-2">
            <NqHealthMeasure :value="bmi" unit="bmi" :format="{ maximumFractionDigits: 1 }" />
            <NqBadge v-if="category" :variant="bmiVariant">
              <component :is="BMI_ICON[category]" aria-hidden="true" />
              {{ t.categories[category] }}
            </NqBadge>
          </span>
          <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notMeasured }}</span>
        </template>
      </NqStatCard>
      <NqStatCard :label="t.bodyWater">
        <template #icon><Droplet /></template>
        <template #value>
          <NqHealthMeasure v-if="v.bodyWaterPercent != null" :value="v.bodyWaterPercent" unit="percent" :format="{ maximumFractionDigits: 1 }" />
          <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notMeasured }}</span>
        </template>
      </NqStatCard>
      <NqStatCard :label="t.visceralFat">
        <template #icon><Flame /></template>
        <template #value>
          <NqHealthMeasure v-if="v.visceralFat != null" :value="v.visceralFat" unit="level" :format="{ maximumFractionDigits: 0 }" />
          <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notMeasured }}</span>
        </template>
      </NqStatCard>
      <NqStatCard :label="t.muscleMass">
        <template #icon><Dumbbell /></template>
        <template #value>
          <NqHealthMeasure v-if="v.muscleMassKg != null" :value="v.muscleMassKg" unit="kilogram" :format="{ maximumFractionDigits: 1 }" />
          <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notMeasured }}</span>
        </template>
      </NqStatCard>
      <NqStatCard :label="t.metabolicAge">
        <template #icon><Hourglass /></template>
        <template #value>
          <NqHealthMeasure v-if="v.metabolicAge != null" :value="v.metabolicAge" unit="year" :format="{ unitDisplay: 'long', maximumFractionDigits: 0 }" />
          <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notMeasured }}</span>
        </template>
      </NqStatCard>
      <NqStatCard :label="t.restingHeartRate" :sparkline="v.trends?.restingHeartRate" :sparkline-label="t.trendLabel(t.restingHeartRate)">
        <template #icon><Heart /></template>
        <template #value>
          <NqHealthMeasure v-if="v.restingHeartRate != null" :value="v.restingHeartRate" unit="bpm" :format="{ maximumFractionDigits: 0 }" />
          <span v-else class="text-body-sm font-normal text-muted-foreground">{{ t.notMeasured }}</span>
        </template>
      </NqStatCard>
    </NqStatGrid>

    <p v-if="category" class="text-caption text-muted-foreground">{{ t.bmiNote }}</p>

    <NqCard>
      <NqCardHeader>
        <NqCardTitle as="h3" class="text-h3">{{ t.targets }}</NqCardTitle>
        <NqCardDescription>{{ t.targetsDescription }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent>
        <p v-if="!hasTargets" class="text-body-sm text-muted-foreground">{{ t.noBaseline }}</p>
        <ul v-else class="m-0 grid list-none gap-5 p-0 sm:grid-cols-2">
          <template v-for="key in TARGET_KEYS" :key="key">
            <li v-if="v.targets?.[key]" data-slot="vitals-target" :data-on-target="v.targets[key]!.onTarget || undefined" class="flex flex-col gap-2">
              <div class="flex items-center justify-end gap-2">
                <NqStatus :tone="v.targets[key]!.onTarget ? 'success' : 'info'" :icon="v.targets[key]!.onTarget ? CircleCheck : CircleDot">
                  {{ v.targets[key]!.onTarget ? t.onTarget : t.inProgress }}
                </NqStatus>
              </div>
              <NqMeter
                :label="t[TARGET_META[key].label]"
                :value="clampPercent(v.targets[key]!.percent)"
                :max="100"
                :tone="v.targets[key]!.onTarget ? 'success' : 'default'"
                show-value
                :value-text="`${fmt(v.targets[key]!.current, key)} / ${fmt(v.targets[key]!.target, key)}`"
              />
              <span v-if="!v.targets[key]!.onTarget" class="text-caption text-muted-foreground">
                {{ t.toGo }} <NqHealthMeasure :value="Math.abs(distanceToTarget(v.targets[key]!))" :unit="TARGET_META[key].unit" :format="{ maximumFractionDigits: TARGET_META[key].digits }" />
              </span>
            </li>
          </template>
        </ul>
      </NqCardContent>
    </NqCard>
  </section>
</template>
