<script setup lang="ts">
import { Check, ShieldCheck, Sparkles } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqDialog, NqDialogClose, NqDialogContent, NqDialogDescription, NqDialogTitle, NqDialogTrigger } from "../dialog";
import { NqPrice } from "../price";
import { NqBillingPeriodSwitch, NqPlanPicker, planPrice, yearlySavings, type BillingPeriod, type PricingPlan } from "../pricing-table";
import NqOfferClock from "./NqOfferClock.vue";
import { useUpgradeStrings, type UpgradeLabels } from "./strings";

export interface UpgradeOffer {
  /** "Launch offer: 30% off your first year". */
  label: string;
  /** When it ends. Shows a live countdown. */
  endsAt?: Date | string | number;
}

// The upgrade popup: open it when someone hits a limit or reaches for a paid feature. It leads with what they
// get, shows the price and a way out ("Maybe later"), and goes straight to checkout. The `trigger` slot becomes
// the dialog's trigger; `icon`, `title`, `description`, `cta` and `note` slots replace the matching props.
interface Props {
  /** Controlled open state (`v-model:open`). */
  open?: boolean;
  defaultOpen?: boolean;
  /** What they get, not what they pay: "Unlock unlimited projects". */
  title?: string;
  description?: string;
  /** Three to five concrete wins. */
  benefits?: string[];
  /** The plans on offer. One plan shows its price; several show a `NqPlanPicker`. Leave out to show no price (the button then just says "Upgrade now"). */
  plans?: PricingPlan[];
  /** The plan picked first. Default: the highlighted plan, else the first. */
  defaultPlanId?: string;
  currentPlanId?: string;
  currency?: string;
  defaultPeriod?: BillingPeriod;
  /** A time-limited offer, shown above the button. */
  offer?: UpgradeOffer;
  /** The reassurance under the button. Default "Cancel anytime. Your data stays yours."; `null` hides it. */
  note?: string | null;
  /** The button. Return a promise to keep it busy until checkout opens. */
  onUpgrade: (planId: string | undefined, period: BillingPeriod) => void | Promise<unknown>;
  /** Override the button label. */
  cta?: string;
  labels?: UpgradeLabels;
}
const props = withDefaults(defineProps<Props>(), {
  open: undefined,
  defaultOpen: undefined,
  title: undefined,
  description: undefined,
  benefits: undefined,
  plans: undefined,
  defaultPlanId: undefined,
  currentPlanId: undefined,
  currency: undefined,
  defaultPeriod: "year",
  offer: undefined,
  note: undefined,
  cta: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const currency = useCurrency(() => props.currency);
const { t } = useUpgradeStrings(() => props.labels);
const choices = computed(() => props.plans?.filter((p) => p.id !== props.currentPlanId) ?? []);
const planId = ref<string | undefined>(props.defaultPlanId ?? (choices.value.find((p) => p.highlighted) ?? choices.value[0])?.id);
const hasYearly = computed(() => choices.value.some((p) => p.yearly !== undefined));
const period = ref<BillingPeriod>(hasYearly.value ? props.defaultPeriod : "month");
const pending = ref(false);
const plan = computed(() => choices.value.find((p) => p.id === planId.value));
const price = computed(() => (plan.value ? planPrice(plan.value, period.value) : null));
const name = computed(() => (plan.value && typeof plan.value.name === "string" ? plan.value.name : ""));

async function upgrade() {
  const result = props.onUpgrade(planId.value, period.value);
  if (result && typeof (result as Promise<unknown>).then === "function") {
    pending.value = true;
    try {
      await result;
    } finally {
      pending.value = false;
    }
  }
}
</script>

<template>
  <NqDialog :open="props.open" :default-open="props.defaultOpen" @update:open="emit('update:open', $event)">
    <NqDialogTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></NqDialogTrigger>
    <NqDialogContent data-slot="upgrade-dialog" class="max-w-md gap-0 overflow-hidden p-0">
      <div class="flex flex-col items-center gap-3 bg-[color-mix(in_oklab,var(--nq-brand)_12%,var(--nq-surface))] px-6 pt-8 pb-6 text-center">
        <span class="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-md [&_svg]:size-6">
          <slot name="icon"><Sparkles aria-hidden="true" /></slot>
        </span>
        <NqDialogTitle class="text-h3 text-foreground"><slot name="title">{{ props.title }}</slot></NqDialogTitle>
        <NqDialogDescription v-if="props.description || $slots.description" class="text-body-sm text-muted-foreground">
          <slot name="description">{{ props.description }}</slot>
        </NqDialogDescription>
      </div>
      <div class="flex flex-col gap-5 p-6">
        <ul v-if="props.benefits && props.benefits.length > 0" class="flex flex-col gap-2.5">
          <li v-for="(b, i) in props.benefits" :key="i" class="flex items-start gap-2.5 text-body-sm text-foreground">
            <span class="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-nq-success-soft text-nq-success-text">
              <Check aria-hidden="true" class="size-3" :stroke-width="3" />
            </span>
            {{ b }}
          </li>
        </ul>

        <div v-if="choices.length > 0" class="flex flex-col gap-3">
          <NqBillingPeriodSwitch v-if="hasYearly" v-model="period" :savings="yearlySavings(choices)" class="justify-center" />
          <NqPlanPicker v-if="choices.length > 1" :plans="choices" :model-value="planId" :currency="currency" :period="period" @update:model-value="planId = $event" />
          <div v-else-if="price && plan" class="flex items-baseline justify-center gap-2">
            <NqPrice :amount="price.amount" :compare-at="price.compareAt" :currency="currency" :period="plan.perSeat ? 'seat-month' : 'month'" size="lg" />
          </div>
        </div>

        <div v-if="props.offer" class="flex flex-col items-center gap-1 rounded-control bg-nq-accent/10 px-3 py-2 text-center">
          <span class="text-label text-nq-accent-text">{{ props.offer.label }}</span>
          <NqOfferClock v-if="props.offer.endsAt !== undefined" :ends-at="props.offer.endsAt" :label="t.endsIn" />
        </div>

        <div class="flex flex-col gap-2">
          <NqButton variant="primary" size="lg" :aria-busy="pending || undefined" :disabled="pending" @click="upgrade">
            <slot name="cta">{{ props.cta ?? (name ? t.upgradeTo(name) : t.upgradeNow) }}</slot>
          </NqButton>
          <NqDialogClose as-child><NqButton variant="ghost">{{ t.later }}</NqButton></NqDialogClose>
        </div>
        <p v-if="props.note !== null" class="flex items-center justify-center gap-1.5 text-center text-caption text-muted-foreground">
          <ShieldCheck aria-hidden="true" class="size-3.5 shrink-0" />
          <slot name="note">{{ props.note ?? t.cancelAnytime }}</slot>
        </p>
      </div>
    </NqDialogContent>
  </NqDialog>
</template>
