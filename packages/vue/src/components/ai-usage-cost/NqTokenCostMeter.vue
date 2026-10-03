<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { formatNumber } from "../numeric";
import { NqUsageMeter } from "../usage-meter";
import { useAiUsageCostLabels, type AiUsageCostLabels } from "./strings";
import { tokenSplit } from "./usage-cost-math";

// One run's tokens split into input, output and cached, with an optional spend meter against its budget.
const props = withDefaults(
  defineProps<{
    tokensIn: number;
    tokensOut: number;
    /** Part of `tokensIn` that was served from the cache. */
    cached?: number;
    /** Cost of the run so far. */
    cost?: number;
    /** Budget for the run. Adds a spend meter. */
    budget?: number | null;
    currency?: string;
    labels?: AiUsageCostLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { cached: 0, cost: undefined, budget: undefined, currency: undefined, labels: undefined },
);

const currency = useCurrency(() => props.currency);
const { locale, t } = useAiUsageCostLabels(() => props.labels);
const split = computed(() => tokenSplit(props.tokensIn, props.tokensOut, props.cached));
const n = (v: number) => formatNumber(v, locale.value, { notation: "compact", maximumFractionDigits: 1 });
const parts = computed(() => [
  { key: "input", label: t.value.input, value: props.tokensIn - Math.min(props.cached, props.tokensIn), share: split.value.input, color: "var(--primary)" },
  { key: "cached", label: t.value.cached, value: Math.min(props.cached, props.tokensIn), share: split.value.cached, color: "var(--nq-info)" },
  { key: "output", label: t.value.output, value: props.tokensOut, share: split.value.output, color: "var(--nq-warning)" },
]);
</script>

<template>
  <div data-slot="token-cost-meter" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div class="flex items-baseline justify-between gap-3 text-body-sm">
      <span class="text-label text-foreground">{{ t.tokenSplit }}</span>
      <bdi class="text-muted-foreground tabular-nums">{{ t.tokenTotal(n(tokensIn + tokensOut)) }}</bdi>
    </div>
    <div role="img" :aria-label="parts.map((p) => `${p.label} ${n(p.value)}`).join(', ')" class="flex h-2 overflow-hidden rounded-full bg-nq-surface-soft" dir="ltr">
      <template v-for="p in parts" :key="p.key">
        <span v-if="p.share > 0" class="h-full" :style="{ width: `${p.share * 100}%`, background: p.color }" />
      </template>
    </div>
    <ul class="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
      <li v-for="p in parts" :key="p.key" class="flex items-center gap-1.5">
        <span aria-hidden="true" class="size-2 rounded-full" :style="{ background: p.color }" />
        {{ p.label }}
        <bdi class="text-foreground tabular-nums">{{ n(p.value) }}</bdi>
      </li>
    </ul>
    <NqUsageMeter v-if="budget !== undefined && cost !== undefined" :label="t.budget" :used="cost" :limit="budget" kind="money" :currency="currency" size="sm" />
  </div>
</template>
