<script setup lang="ts">
import { Check, Minus } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqTooltip } from "../tooltip";
import NqPlanPrice from "./NqPlanPrice.vue";
import { planAction, usePricingLabels, type BillingPeriod, type PricingLabels, type PricingPlan } from "./pricing";

// Every feature, plan by plan. The header with the plan names, prices and buttons stays on screen while you scroll.
interface Props {
  plans: PricingPlan[];
  sections: PlanComparisonSection[];
  currency?: string;
  period?: BillingPeriod;
  currentPlanId?: string;
  /** Adds each plan's button to the sticky header, so people can subscribe from the row they are reading. */
  onSelect?: (plan: PricingPlan, period: BillingPeriod) => void | Promise<unknown>;
  /** The table's accessible name. */
  caption?: string;
  labels?: Partial<PricingLabels>;
  class?: HTMLAttributes["class"];
}
export interface PlanComparisonRow {
  label: string;
  hint?: string;
  /** Keyed by plan id. `true` is a check, `false` or missing a dash, anything else is shown as is ("10 GB"). */
  values: Record<string, boolean | string | number | undefined>;
}
export interface PlanComparisonSection {
  /** A group heading: "Projects", "Security". */
  title?: string;
  rows: PlanComparisonRow[];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, period: "month", currentPlanId: undefined, onSelect: undefined, caption: undefined, labels: undefined });
defineOptions({ inheritAttrs: false });
const currency = useCurrency(() => props.currency);
const { t } = usePricingLabels(() => props.labels);
const tint = "bg-[color-mix(in_oklab,var(--nq-brand)_7%,transparent)]";
const isOn = (v: unknown) => v === true;
const isOff = (v: unknown) => v === false || v === undefined || v === null;
</script>

<template>
  <div data-slot="plan-comparison" :class="cn('w-full overflow-x-auto', props.class)" v-bind="$attrs">
    <table class="w-full min-w-[40rem] border-separate border-spacing-0 text-start">
      <caption v-if="caption" class="sr-only">{{ caption }}</caption>
      <thead class="sticky top-0 z-1 bg-background">
        <tr>
          <th scope="col" class="w-[28%] border-b border-border p-3 text-start align-bottom text-label text-muted-foreground">{{ t.feature }}</th>
          <th
            v-for="plan in plans"
            :key="plan.id"
            scope="col"
            :data-highlighted="plan.highlighted || undefined"
            :class="cn('border-b border-border p-3 text-center align-bottom font-normal', plan.highlighted && tint)"
          >
            <div class="flex flex-col items-center gap-2">
              <span class="text-h4 text-foreground">{{ plan.name }}</span>
              <NqPlanPrice :plan="plan" :period="period" :currency="currency" size="sm" />
              <NqButton
                v-if="onSelect"
                size="sm"
                :variant="planAction(plan, plans, t, currentPlanId).variant"
                :disabled="planAction(plan, plans, t, currentPlanId).disabled"
                class="h-auto min-h-8 w-full max-w-44 whitespace-normal py-1 leading-tight text-balance"
                @click="onSelect(plan, period)"
              >
                {{ planAction(plan, plans, t, currentPlanId).label }}
              </NqButton>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(section, s) in sections" :key="s">
          <tr v-if="section.title">
            <th scope="colgroup" :colspan="plans.length + 1" class="px-3 pt-6 pb-2 text-start text-label text-foreground">{{ section.title }}</th>
          </tr>
          <tr v-for="(row, r) in section.rows" :key="r" class="hover:bg-nq-hover/50">
            <th scope="row" class="border-b border-border px-3 py-2.5 text-start text-body-sm font-normal text-foreground">
              <NqTooltip v-if="row.hint" :content="row.hint">
                <span tabindex="0" class="cursor-help underline decoration-nq-line decoration-dotted underline-offset-4">{{ row.label }}</span>
              </NqTooltip>
              <template v-else>{{ row.label }}</template>
            </th>
            <td v-for="plan in plans" :key="plan.id" :class="cn('border-b border-border px-3 py-2.5 text-center', plan.highlighted && tint)">
              <template v-if="isOn(row.values[plan.id])">
                <Check aria-hidden="true" class="mx-auto size-4 text-nq-brand" />
                <span class="sr-only">{{ t.included }}</span>
              </template>
              <template v-else-if="isOff(row.values[plan.id])">
                <Minus aria-hidden="true" class="mx-auto size-4 text-muted-foreground/60" />
                <span class="sr-only">{{ t.notIncluded }}</span>
              </template>
              <span v-else class="text-body-sm text-foreground">{{ row.values[plan.id] }}</span>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
