<script setup lang="ts">
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqPlanCard, NqPlanGrid } from "../plan-card";
import NqBillingPeriodSwitch from "./NqBillingPeriodSwitch.vue";
import NqPlanPrice from "./NqPlanPrice.vue";
import { planAction, priceNote, usePricingLabels, yearlySavings, type BillingPeriod, type PricingLabels, type PricingPlan } from "./pricing";

// The pricing section: a Monthly / Yearly switch and one NqPlanCard per plan, built from data. Every card has
// a working button that knows the account's current plan, so people can subscribe, upgrade or downgrade here.
interface Props {
  /** Smallest first. Up to four. */
  plans: PricingPlan[];
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Billing period (`v-model:period`). */
  period?: BillingPeriod;
  defaultPeriod?: BillingPeriod;
  /** The plan the account is on. Its card says "Current plan"; the others say Upgrade or Downgrade. */
  currentPlanId?: string;
  /**
   * A plan's button. Return a promise to show the button busy until it settles (a checkout redirect).
   * Use it as `@select` or `:on-select`.
   */
  onSelect?: (plan: PricingPlan, period: BillingPeriod) => void | Promise<unknown>;
  /** Hide the Monthly / Yearly switch. It is also hidden when no plan has a yearly price. */
  hidePeriodSwitch?: boolean;
  /** One line under the plans: "Prices in USD, excluding VAT. Cancel anytime." (Or the `note` slot.) */
  note?: string;
  labels?: Partial<PricingLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  period: undefined,
  defaultPeriod: "month",
  currentPlanId: undefined,
  onSelect: undefined,
  hidePeriodSwitch: false,
  note: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:period": [period: BillingPeriod] }>();
defineOptions({ inheritAttrs: false });

const currency = useCurrency(() => props.currency);
const { locale, t } = usePricingLabels(() => props.labels);
const inner = ref<BillingPeriod>(props.period ?? props.defaultPeriod);
watch(
  () => props.period,
  (p) => p && (inner.value = p),
);
const period = computed(() => props.period ?? inner.value);
function setPeriod(p: BillingPeriod) {
  inner.value = p;
  emit("update:period", p);
}
const pending = ref<string | null>(null);
const hasYearly = computed(() => props.plans.some((p) => p.yearly !== undefined));
const actions = computed(() => props.plans.map((plan) => planAction(plan, props.plans, t.value, props.currentPlanId)));

async function select(plan: PricingPlan) {
  if (!props.onSelect || pending.value) return;
  const result = props.onSelect(plan, period.value);
  if (result && typeof (result as Promise<unknown>).then === "function") {
    pending.value = plan.id;
    try {
      await result;
    } finally {
      pending.value = null;
    }
  }
}
</script>

<template>
  <div data-slot="pricing-table" :class="cn('flex flex-col items-center gap-8', props.class)" v-bind="$attrs">
    <NqBillingPeriodSwitch v-if="hasYearly && !hidePeriodSwitch" :model-value="period" :savings="yearlySavings(plans)" :labels="labels" @update:model-value="setPeriod" />
    <div class="w-full">
      <NqPlanGrid>
        <NqPlanCard
          v-for="(plan, i) in plans"
          :key="plan.id"
          :name="plan.name"
          :description="plan.description"
          :highlighted="plan.highlighted"
          :current="plan.id === currentPlanId"
          :badge="plan.id === currentPlanId ? undefined : plan.badge"
          :price-note="priceNote(plan, period, t, currency, locale)"
          :features-title="plan.featuresTitle"
          :features="plan.features"
          :footnote="plan.footnote"
        >
          <template #price><NqPlanPrice :plan="plan" :period="period" :currency="currency" /></template>
          <template #action>
            <NqButton
              size="lg"
              :variant="actions[i]!.variant"
              :disabled="actions[i]!.disabled || (pending !== null && pending !== plan.id)"
              :aria-busy="pending === plan.id || undefined"
              @click="select(plan)"
            >
              {{ actions[i]!.label }}
            </NqButton>
          </template>
        </NqPlanCard>
      </NqPlanGrid>
    </div>
    <p v-if="$slots.note || note" class="text-center text-caption text-muted-foreground"><slot name="note">{{ note }}</slot></p>
  </div>
</template>
