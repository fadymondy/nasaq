<script setup lang="ts">
import { NqChartContainer, NqChartLegendContent, NqChartTooltipContent, NqSparkline, type ChartConfig } from "@fadymondy/nasaq/vue";

// Vue ships the chart frame, tooltip, legend and sparkline. Draw the plot itself with the Vue chart library you
// already use (Unovis, ECharts, Chart.js) and colour it with var(--color-<key>).
const config: ChartConfig = {
  revenue: { label: "Revenue" },
  cost: { label: "Cost", color: "var(--nq-tag-amber)" },
};
const legend = [{ dataKey: "revenue", color: "var(--color-revenue)" }, { dataKey: "cost", color: "var(--color-cost)" }];
const tooltip = [{ dataKey: "revenue", value: 30500 }, { dataKey: "cost", value: 18400 }];
</script>

<template>
  <div class="grid gap-4">
    <NqChartContainer :config="config" label="Revenue and cost, January to March" class="aspect-auto h-64 flex-col items-center gap-4">
      <NqSparkline :data="[18600, 30500, 23700]" color="var(--color-revenue)" label="Revenue, January to March" class="h-24 w-full" />
      <NqChartTooltipContent :config="config" label="Feb" :payload="tooltip" :value-format="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }" />
      <NqChartLegendContent :config="config" :payload="legend" />
    </NqChartContainer>
  </div>
</template>
