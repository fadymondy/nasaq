<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqSkeleton } from "../states";
import NqRatesDay from "./NqRatesDay.vue";
import NqRatesMoney from "./NqRatesMoney.vue";
import { shiftDay } from "./rates-logic";
import { todayKey, useRatesStrings, type RatesSubscriptionsLabels } from "./strings";
import { subscriptionCharges, subscriptionMonthly, type Subscription } from "./subscriptions";

// The organisation's billing at a glance: monthly recurring total, active count, what is due in 30 days, a split by project and the upcoming charges.
interface Props {
  subscriptions: readonly Subscription[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  today?: string;
  loading?: boolean;
  labels?: RatesSubscriptionsLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, today: undefined, loading: false, labels: undefined });
const currency = useCurrency(() => props.currency);
const { t, n } = useRatesStrings(() => props.labels);
const titleId = `nq-billing-${useId()}`;

const summary = computed(() => {
  const today = props.today ?? todayKey();
  const horizon = shiftDay(today, 30);
  const active = props.subscriptions.filter((s) => s.status === "active");
  let mrr = 0;
  const byProject = new Map<string, { name: string; monthly: number }>();
  const upcoming: { id: string; name: string; day: string; amount: number }[] = [];
  for (const s of active) {
    const monthly = subscriptionMonthly(s, today);
    mrr += monthly;
    const key = s.projectId ?? "";
    const row = byProject.get(key) ?? { name: s.projectName ?? t.value.orgLevel, monthly: 0 };
    row.monthly += monthly;
    byProject.set(key, row);
    for (const day of subscriptionCharges(s, today, 12)) if (day <= horizon) upcoming.push({ id: `${s.id}-${day}`, name: s.name, day, amount: s.amount * (s.quantity ?? 1) });
  }
  upcoming.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  return {
    active: active.length,
    mrr,
    projects: [...byProject.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.monthly - a.monthly),
    upcoming,
    due: upcoming.reduce((s, u) => s + u.amount, 0),
  };
});
</script>

<template>
  <section data-slot="billing-overview" :aria-labelledby="titleId" :class="cn('flex flex-col gap-4', props.class)">
    <h2 :id="titleId" class="text-h3 text-foreground">{{ t.overview }}</h2>
    <NqStatGrid>
      <NqStatCard :loading="props.loading" :label="t.mrr"><template #value><NqRatesMoney :minor="summary.mrr" :currency="currency" /></template></NqStatCard>
      <NqStatCard :loading="props.loading" :label="t.activeCount"><template #value>{{ n(summary.active) }}</template></NqStatCard>
      <NqStatCard :loading="props.loading" :label="t.dueSoon"><template #value><NqRatesMoney :minor="summary.due" :currency="currency" /></template></NqStatCard>
    </NqStatGrid>
    <NqSkeleton v-if="props.loading" aria-busy="true" class="h-32 w-full" />
    <div v-else class="grid gap-4 md:grid-cols-2">
      <NqCard class="gap-3 px-0">
        <NqCardHeader><NqCardTitle as="h3">{{ t.byProject }}</NqCardTitle></NqCardHeader>
        <NqCardContent>
          <ul class="flex flex-col gap-2">
            <li v-for="p in summary.projects" :key="p.id" class="flex flex-col gap-1">
              <span class="flex items-center justify-between gap-3 text-body-sm">
                <span class="truncate text-foreground">{{ p.name }}</span>
                <NqRatesMoney :minor="p.monthly" :currency="currency" class="tabular-nums text-muted-foreground" />
              </span>
              <span class="h-1.5 overflow-hidden rounded-full bg-nq-surface" aria-hidden="true">
                <span class="block h-full rounded-full bg-primary" :style="{ width: `${summary.mrr ? Math.max(2, Math.round((p.monthly / summary.mrr) * 100)) : 0}%` }" />
              </span>
            </li>
          </ul>
        </NqCardContent>
      </NqCard>
      <NqCard class="gap-3 px-0">
        <NqCardHeader><NqCardTitle as="h3">{{ t.upcoming }}</NqCardTitle></NqCardHeader>
        <NqCardContent>
          <p v-if="summary.upcoming.length === 0" class="text-body-sm text-muted-foreground">{{ t.noUpcoming }}</p>
          <ul v-else class="flex flex-col divide-y divide-border">
            <li v-for="u in summary.upcoming" :key="u.id" class="flex items-center justify-between gap-3 py-2 text-body-sm">
              <span class="flex min-w-0 flex-col">
                <span class="truncate text-foreground">{{ u.name }}</span>
                <span class="text-caption text-muted-foreground"><NqRatesDay :day="u.day" /></span>
              </span>
              <NqRatesMoney :minor="u.amount" :currency="currency" />
            </li>
          </ul>
        </NqCardContent>
      </NqCard>
    </div>
  </section>
</template>
