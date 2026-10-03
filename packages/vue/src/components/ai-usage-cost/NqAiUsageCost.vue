<script setup lang="ts">
import { Coins, Cpu, ReceiptText, Sparkles, Wallet } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBreakdownTable, type BreakdownColumn, type BreakdownRow } from "../breakdown-table";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqChartContainer, NqChartLegendContent, type ChartConfig } from "../chart";
import { parseAnalyticsDay } from "../metric-tiles";
import { formatDate, formatNumber, type FormatNumberOptions } from "../numeric";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { useAiUsageCostLabels, type AiUsageCostLabels } from "./strings";
import { costTotals, sumTokens, withMarkup, type AiCostDay, type AiCostRow } from "./usage-cost-math";

// AI spend at a glance: total, tokens, billed, unbilled and the client price with markup, a daily stacked bar of billed and unbilled
// cost, and a breakdown by model, product or run with token columns. React draws the chart with Recharts; here it is hand-drawn flex
// bars, so time runs right to left in RTL.
const props = withDefaults(
  defineProps<{
    /** Daily spend, oldest first. */
    days: readonly AiCostDay[];
    /** Cost by model. */
    byModel?: readonly AiCostRow[];
    /** Cost by product or feature. */
    byProduct?: readonly AiCostRow[];
    /** Cost by run, task or job. */
    byRun?: readonly AiCostRow[];
    /** Markup on provider cost as a fraction: 0.2 is +20%. Adds the client-price tile. */
    markup?: number;
    /** Total cost of the previous period, adds a change to the total tile. */
    previousTotal?: number;
    /** ISO 4217 code. Default USD, or SAR in Arabic. */
    currency?: string;
    loading?: boolean;
    labels?: AiUsageCostLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { byModel: undefined, byProduct: undefined, byRun: undefined, markup: undefined, previousTotal: undefined, currency: undefined, loading: false, labels: undefined },
);

const currency = useCurrency(() => props.currency);
const { locale, t } = useAiUsageCostLabels(() => props.labels);
const totals = computed(() => costTotals(props.days));
const primary = computed(() => props.byModel ?? props.byProduct ?? props.byRun ?? []);
const tokens = computed(() => sumTokens(primary.value));
const money = (max = 2): FormatNumberOptions => ({ style: "currency", currency: currency.value, maximumFractionDigits: max });
const compact: FormatNumberOptions = { notation: "compact", maximumFractionDigits: 1 };
const delta = computed(() => (props.previousTotal && props.previousTotal > 0 ? (totals.value.total - props.previousTotal) / props.previousTotal : undefined));

const config = computed<ChartConfig>(() => ({ billed: { label: t.value.billed, color: "var(--primary)" }, unbilled: { label: t.value.unbilled, color: "var(--nq-warning)" } }));
const legend = [
  { dataKey: "billed", color: "var(--color-billed)" },
  { dataKey: "unbilled", color: "var(--color-unbilled)" },
];
const axis = (v: number) => formatNumber(v, locale.value, { style: "currency", currency: currency.value, notation: "compact", maximumFractionDigits: 0 });
const max = computed(() => Math.max(0.0001, ...props.days.map((d) => d.billed + d.unbilled)));
const bars = computed(() =>
  props.days.map((d, i) => {
    const label = formatDate(parseAnalyticsDay(d.date), locale.value, { day: "numeric", month: "short" });
    const fmt = (v: number) => formatNumber(v, locale.value, money());
    return { i, label, billed: (d.billed / max.value) * 100, unbilled: (d.unbilled / max.value) * 100, title: `${label}: ${t.value.billed} ${fmt(d.billed)}, ${t.value.unbilled} ${fmt(d.unbilled)}` };
  }),
);

const tabs = computed(
  () =>
    [
      { id: "model", label: t.value.byModel, dim: t.value.model, rows: props.byModel },
      { id: "product", label: t.value.byProduct, dim: t.value.product, rows: props.byProduct },
      { id: "run", label: t.value.byRun, dim: t.value.run, rows: props.byRun },
    ].filter((x) => x.rows && x.rows.length > 0) as { id: string; label: string; dim: string; rows: readonly AiCostRow[] }[],
);

const breakdown = (rows: readonly AiCostRow[]): BreakdownRow[] => rows.map((r) => ({ id: r.id, label: r.label, value: r.cost, previous: r.previous }));
const columns = computed<BreakdownColumn[]>(() => [
  { id: "in", header: t.value.tokensIn, align: "end" },
  { id: "out", header: t.value.tokensOut, align: "end" },
]);
const tokenCell = (rows: readonly AiCostRow[], row: BreakdownRow, key: "tokensIn" | "tokensOut") => formatNumber(rows.find((r) => r.id === row.id)?.[key] ?? 0, locale.value, compact);
const tableFormat = computed<FormatNumberOptions>(() => ({ style: "currency", currency: currency.value, maximumFractionDigits: 2 }));
const pct = (n: number) => formatNumber(n, locale.value, { style: "percent", maximumFractionDigits: 0 });
</script>

<template>
  <div data-slot="ai-usage-cost" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <NqStatGrid>
      <NqStatCard :loading="loading" :label="t.total" :value="totals.total" :format="money(0)" :delta="delta" :delta-label="t.vsPrevious" invert>
        <template #icon><Wallet /></template>
      </NqStatCard>
      <NqStatCard :loading="loading" :label="t.tokens" :value="tokens.total" :format="compact">
        <template #icon><Cpu /></template>
      </NqStatCard>
      <NqStatCard :loading="loading" :label="t.billed" :value="totals.billed" :format="money()">
        <template #icon><ReceiptText /></template>
      </NqStatCard>
      <NqStatCard :loading="loading" :label="t.unbilled" :value="totals.unbilled" :format="money()">
        <template #icon><Coins /></template>
      </NqStatCard>
      <NqStatCard v-if="markup !== undefined" :loading="loading" :label="t.clientPrice(pct(markup))" :value="withMarkup(totals.total, markup)" :format="money()">
        <template #icon><Sparkles /></template>
      </NqStatCard>
    </NqStatGrid>

    <NqCard>
      <NqCardHeader>
        <NqCardTitle as="h3" class="text-h3">{{ t.daily }}</NqCardTitle>
        <NqCardDescription>{{ t.dailyHint }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent>
        <NqChartContainer :config="config" :label="`${t.daily}. ${t.chartLabel(days.length)}`" class="aspect-auto h-52 flex-col justify-start gap-2">
          <div class="flex min-h-0 flex-1 gap-2">
            <div aria-hidden="true" class="flex w-12 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums">
              <span>{{ axis(max) }}</span>
              <span>{{ axis(0) }}</span>
            </div>
            <div class="flex min-w-0 flex-1 items-end gap-1 border-b border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:100%_50%]">
              <div v-for="bar in bars" :key="bar.i" data-slot="chart-bar" :title="bar.title" class="flex h-full min-w-0 flex-1 flex-col-reverse justify-start">
                <span class="block w-full" :style="{ height: `${bar.billed}%`, backgroundColor: 'var(--color-billed)' }" />
                <span class="block w-full rounded-t-[3px]" :style="{ height: `${bar.unbilled}%`, backgroundColor: 'var(--color-unbilled)' }" />
              </div>
            </div>
          </div>
          <div aria-hidden="true" class="flex justify-between ps-14 text-muted-foreground">
            <span>{{ bars[0]?.label }}</span>
            <span>{{ bars[bars.length - 1]?.label }}</span>
          </div>
          <NqChartLegendContent :config="config" :payload="legend" />
        </NqChartContainer>
      </NqCardContent>
    </NqCard>

    <NqTabs v-if="tabs.length > 0" :default-value="tabs[0]!.id">
      <NqTabsList :aria-label="t.breakdownBy">
        <NqTabsTab v-for="x in tabs" :key="x.id" :value="x.id">{{ x.label }}</NqTabsTab>
      </NqTabsList>
      <NqTabsPanel v-for="x in tabs" :key="x.id" :value="x.id" class="pt-3">
        <NqBreakdownTable
          :rows="breakdown(x.rows)"
          :label="`${t.breakdownBy}: ${x.label}`"
          :dimension-label="x.dim"
          :value-label="t.cost"
          :format="tableFormat"
          :columns="columns"
          invert
          ltr-labels
          :loading="loading"
        >
          <template #cell-in="{ row }"><bdi>{{ tokenCell(x.rows, row, "tokensIn") }}</bdi></template>
          <template #cell-out="{ row }"><bdi>{{ tokenCell(x.rows, row, "tokensOut") }}</bdi></template>
        </NqBreakdownTable>
      </NqTabsPanel>
    </NqTabs>
  </div>
</template>
