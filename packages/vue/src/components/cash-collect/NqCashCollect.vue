<script setup lang="ts">
import { Banknote, Check, CircleAlert, Undo2 } from "lucide-vue-next";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { cashBreakdown, deliveryCurrency, deliveryMinorFactor, deliveryMoney } from "./delivery";
import { STRINGS, type CashCollectLabels } from "./strings";

// The cash-on-delivery sheet for a courier: order total plus delivery fee (minus anything paid online) as the amount
// due, an amount received field in minor units, and a plain statement of what is short or what change to hand back.
// Nothing is conveyed by colour alone: the state is a sentence with an icon. Amounts are integer minor units.
interface Props {
  /** Order total in minor units (cents, halalas). */
  orderTotalMinor: number;
  /** Delivery fee in minor units. Cash on delivery collects total plus fee. */
  deliveryFeeMinor?: number;
  /** Already paid online, taken off the amount due. */
  prepaidMinor?: number;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Cash received, in minor units. Controlled when set (`v-model:collected-minor`). */
  collectedMinor?: number | null;
  defaultCollectedMinor?: number | null;
  /** Allow confirming less than what is due (a partial payment). Default false. */
  allowShort?: boolean;
  /** Quick-pick buttons in minor units. Defaults to the exact amount and the next round notes. */
  quickAmounts?: readonly number[];
  loading?: boolean;
  locale?: string;
  labels?: CashCollectLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  deliveryFeeMinor: 0,
  prepaidMinor: 0,
  currency: undefined,
  collectedMinor: undefined,
  defaultCollectedMinor: null,
  allowShort: false,
  quickAmounts: undefined,
  loading: false,
  locale: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  /** The received amount changed (`v-model:collected-minor`). */
  "update:collectedMinor": [minor: number | null];
  /** Confirm pressed, with the amount received in minor units (0 when fully prepaid). */
  confirm: [collectedMinor: number];
}>();

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const currency = computed(() => props.currency ?? deliveryCurrency(locale.value));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const uid = useId();
const inner = ref<number | null>(props.defaultCollectedMinor);
watch(
  () => props.collectedMinor,
  (v) => v !== undefined && (inner.value = v),
);
const collected = computed(() => (props.collectedMinor !== undefined ? props.collectedMinor : inner.value));
const b = computed(() => cashBreakdown({ orderTotal: props.orderTotalMinor, deliveryFee: props.deliveryFeeMinor, prepaid: props.prepaidMinor, collected: collected.value }));
const money = (v: number) => deliveryMoney(v, currency.value, locale.value);
const fullyPrepaid = computed(() => b.value.due === 0);
const canConfirm = computed(() => fullyPrepaid.value || (b.value.collected > 0 && (props.allowShort || b.value.collected >= b.value.due)));

/** Round-note suggestions above `due`: the exact amount, then the next 10, 50 and 100 of the major unit. */
function suggestions(due: number, code: string): number[] {
  const f = deliveryMinorFactor(code);
  const set = new Set<number>([due]);
  for (const step of [10, 50, 100]) {
    const up = Math.ceil(due / (step * f)) * step * f;
    if (up > due) set.add(up);
  }
  return [...set].filter((v) => v > 0).slice(0, 4);
}
const quick = computed(() => props.quickAmounts ?? suggestions(b.value.due, currency.value));

function set(next: number | null) {
  inner.value = next;
  emit("update:collectedMinor", next);
}

const rows = computed(() => {
  const list = [
    { key: "total", label: t.value.orderTotal, value: props.orderTotalMinor, negative: false },
    { key: "fee", label: t.value.deliveryFee, value: props.deliveryFeeMinor, negative: false },
  ];
  if (props.prepaidMinor > 0) list.push({ key: "prepaid", label: t.value.prepaid, value: props.prepaidMinor, negative: true });
  return list;
});

const received = computed(() => b.value.state === "exact" && b.value.collected > 0);
const statusText = computed(() => (b.value.state === "over" ? `${t.value.change}: ` : b.value.state === "short" ? `${t.value.shortBy}: ` : received.value ? t.value.exact : t.value.unpaid));
const statusAmount = computed(() => (b.value.state === "over" ? b.value.change : b.value.state === "short" ? b.value.shortBy : null));
const StatusIcon = computed(() => (b.value.state === "over" ? Undo2 : b.value.state === "short" ? CircleAlert : received.value ? Check : Banknote));

defineOptions({ inheritAttrs: false });
</script>

<template>
  <section
    data-slot="cash-collect"
    :data-state="b.state"
    :aria-labelledby="`${uid}-title`"
    :class="cn('flex flex-col gap-4 rounded-card border border-border bg-card p-4 sm:p-5', props.class)"
    v-bind="$attrs"
  >
    <h2 :id="`${uid}-title`" class="text-h3 text-foreground">{{ t.title }}</h2>

    <dl data-slot="cash-breakdown" class="flex flex-col gap-2">
      <div v-for="row in rows" :key="row.key" class="flex items-baseline justify-between gap-3">
        <dt class="text-body-sm text-muted-foreground">{{ row.label }}</dt>
        <dd class="tabular-nums text-body-sm text-foreground"><bdi>{{ row.negative ? "−" : "" }}{{ money(row.value) }}</bdi></dd>
      </div>
      <div class="border-t border-border pt-2">
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-label text-foreground">{{ t.due }}</dt>
          <dd class="tabular-nums text-h3 text-foreground"><bdi>{{ money(b.due) }}</bdi></dd>
        </div>
      </div>
    </dl>

    <p v-if="fullyPrepaid" role="status" class="flex items-center gap-2 rounded-control border border-nq-success/40 bg-nq-success-soft px-3 py-2 text-body-sm text-nq-success-text">
      <Check aria-hidden="true" class="size-4 shrink-0" />
      {{ t.prepaidAll }}
    </p>
    <template v-else>
      <div class="flex flex-col gap-2">
        <label :for="`${uid}-input`" class="text-label text-foreground">{{ t.collected }}</label>
        <NqCurrencyInput :id="`${uid}-input`" :model-value="collected" :currency="currency" :locale="locale" :min="0" @update:model-value="set" />
        <div v-if="quick.length" class="flex flex-wrap gap-2" role="group" :aria-label="t.collected">
          <NqButton
            v-for="amount in quick"
            :key="amount"
            type="button"
            size="sm"
            :variant="collected === amount ? 'primary' : 'secondary'"
            :aria-pressed="collected === amount"
            @click="set(amount)"
          >
            <bdi class="tabular-nums">{{ money(amount) }}</bdi>
          </NqButton>
        </div>
      </div>

      <p
        role="status"
        data-slot="cash-status"
        :class="
          cn(
            'flex items-center gap-2 rounded-control border px-3 py-2 text-body-sm',
            b.state === 'short' && 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text',
            b.state === 'over' && 'border-nq-info/40 bg-nq-info-soft text-nq-info-text',
            received && 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
            (b.state === 'unpaid' || (b.state === 'exact' && b.collected === 0)) && 'border-border bg-secondary text-muted-foreground',
          )
        "
      >
        <component :is="StatusIcon" aria-hidden="true" class="size-4 shrink-0" />
        <span>
          {{ statusText }}<bdi v-if="statusAmount !== null" class="font-medium tabular-nums">{{ money(statusAmount) }}</bdi>
        </span>
        <span v-if="b.state === 'short' && !allowShort" class="sr-only">{{ t.shortHelp }}</span>
      </p>
    </template>

    <NqButton type="button" variant="primary" size="lg" :disabled="!canConfirm" :loading="props.loading" @click="emit('confirm', fullyPrepaid ? 0 : b.collected)">
      <Check aria-hidden="true" />
      {{ t.confirm }}
    </NqButton>
  </section>
</template>
