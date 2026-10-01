<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { formatNumber } from "../numeric";
import NqUsageMeter from "./NqUsageMeter.vue";
import { formatAmount, useUsageLabels, type UsageKind, type UsageMeterLabels } from "./strings";
import { burnProjection, type UsageThresholds } from "./usage-math";

// A project or period budget in hours and money, with the pace. When `elapsed` is given each bar shows where the period stands and
// projects the end-of-period figure at the current rate, so a burn that is fast but still under the limit is visible.
interface Props {
  /** Hours used against the hours budget. */
  hours?: { used: number; budget: number };
  /** Money spent against the money budget. */
  money?: { used: number; budget: number; currency?: string };
  /** Fraction of the period that has passed (0 to 1). Draws a tick and drives the projection. */
  elapsed?: number;
  thresholds?: UsageThresholds;
  labels?: UsageMeterLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { hours: undefined, money: undefined, elapsed: undefined, thresholds: undefined, labels: undefined });
const { locale, t } = useUsageLabels(() => props.labels);

function hint(used: number, budget: number, kind: UsageKind, currency?: string): string | undefined {
  if (props.elapsed === undefined) return undefined;
  const p = burnProjection(used, budget, props.elapsed);
  const f = (n: number) => formatAmount(n, kind, locale.value, t.value, undefined, currency);
  return p.willExceed ? t.value.projectedOver(f(p.projected), f(p.overBy)) : t.value.projectedWithin(f(p.projected));
}
</script>

<template>
  <div data-slot="budget-burn" :class="cn('flex flex-col gap-4', props.class)">
    <NqUsageMeter v-if="hours" :label="t.hours" kind="hours" :used="hours.used" :limit="hours.budget" :thresholds="thresholds" :marker="elapsed" :hint="hint(hours.used, hours.budget, 'hours')" :labels="labels" />
    <NqUsageMeter v-if="money" :label="t.budget" kind="money" :currency="money.currency" :used="money.used" :limit="money.budget" :thresholds="thresholds" :marker="elapsed" :hint="hint(money.used, money.budget, 'money', money.currency)" :labels="labels" />
    <p v-if="elapsed !== undefined" class="text-caption text-muted-foreground">{{ t.periodElapsed(formatNumber(elapsed, locale, { style: "percent", maximumFractionDigits: 0 })) }}</p>
  </div>
</template>
