<script setup lang="ts">
import { Zap } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { useCurrency } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqSkeleton } from "../states";
import NqUsageMeter from "./NqUsageMeter.vue";
import { formatAmount, useUsageLabels, type UsageKind, type UsageMeterLabels } from "./strings";
import { overageAmount, overageTotal, usageTone, type UsageThresholds } from "./usage-math";

// The plan usage page section: every metered resource against the plan, then a strip with the estimated overage and a line per item
// that went over. Money and counts stay left-to-right and isolated inside Arabic text.
export interface UsageItem {
  id: string;
  label: string;
  used: number;
  /** `null` is unlimited. */
  limit: number | null;
  kind?: UsageKind;
  unit?: string;
  /** Price of each unit past the limit, in `currency`. Adds the item to the overage estimate. */
  overageRate?: number;
  hint?: string;
}

interface Props {
  /** Plan name: "Team". Or use the `plan-name` slot. */
  planName?: string;
  /** Which period this is: "1 Sep to 30 Sep". Localise it. */
  period?: string;
  items: readonly UsageItem[];
  /** ISO 4217 code for the overage estimate and money items. Default USD, or SAR in Arabic. */
  currency?: string;
  thresholds?: UsageThresholds;
  /** Shows Upgrade plan when something is near or over its limit. Emits `upgrade`. */
  upgradable?: boolean;
  loading?: boolean;
  labels?: UsageMeterLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { planName: undefined, period: undefined, currency: undefined, thresholds: undefined, upgradable: false, loading: false, labels: undefined });
const emit = defineEmits<{ upgrade: [] }>();
const currency = useCurrency(() => props.currency);
const { locale, t } = useUsageLabels(() => props.labels);
const money = (n: number) => formatAmount(n, "money", locale.value, t.value, undefined, currency.value);
const total = computed(() => overageTotal(props.items));
const over = computed(() => props.items.filter((i) => overageAmount(i) > 0));
const pressed = computed(() => props.items.some((i) => usageTone(i.used, i.limit, props.thresholds) !== "ok"));
</script>

<template>
  <NqCard data-slot="usage-summary" :aria-busy="loading || undefined" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3" class="flex items-center gap-2">
        {{ t.planUsage }}
        <NqBadge variant="brand"><slot name="plan-name">{{ planName === undefined ? "" : t.plan(planName) }}</slot></NqBadge>
      </NqCardTitle>
      <NqCardDescription>{{ period ?? t.period }}</NqCardDescription>
      <NqCardAction v-if="upgradable && pressed">
        <NqButton variant="primary" size="sm" @click="emit('upgrade')">
          <Zap />
          {{ t.upgrade }}
        </NqButton>
      </NqCardAction>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-5">
      <div v-if="loading" role="status" :aria-label="t.loading" class="grid gap-5 sm:grid-cols-2">
        <div v-for="i in 4" :key="i" class="flex flex-col gap-2">
          <NqSkeleton class="h-3.5 w-28" />
          <NqSkeleton class="h-2 w-full" />
        </div>
      </div>
      <div v-else class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <NqUsageMeter v-for="item in items" :key="item.id" :label="item.label" :used="item.used" :limit="item.limit" :kind="item.kind" :unit="item.unit" :currency="currency" :hint="item.hint" :thresholds="thresholds" :labels="labels" />
      </div>
      <NqAlert v-if="!loading" data-slot="usage-overage-strip" :tone="total > 0 ? 'warning' : 'success'" :title="total > 0 ? undefined : t.overageNone">
        <div v-if="total > 0" class="flex flex-col gap-1">
          <div class="flex flex-wrap items-baseline gap-x-2">
            <span class="text-label">{{ t.overageTitle }}</span>
            <bdi data-slot="usage-overage-total" class="text-h3 tabular-nums">{{ money(total) }}</bdi>
          </div>
          <span>{{ t.overageBody }}</span>
          <ul class="mt-1 flex flex-col gap-0.5 text-caption">
            <li v-for="i in over" :key="i.id">{{ t.overageLine(i.label, formatAmount(i.used - (i.limit ?? 0), i.kind ?? "count", locale, t, i.unit, currency), money(overageAmount(i))) }}</li>
          </ul>
        </div>
        <template v-else>{{ t.overageNoneBody }}</template>
      </NqAlert>
    </NqCardContent>
  </NqCard>
</template>
