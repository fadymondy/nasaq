<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency, useNasaq } from "../../provider";
import { useFormatNumber } from "../numeric";

export type PricePeriod = "month" | "year" | "seat-month" | "once";

const PERIOD: Record<Exclude<PricePeriod, "once">, { en: string; ar: string }> = {
  month: { en: "/mo", ar: "/شهريًا" },
  year: { en: "/yr", ar: "/سنويًا" },
  "seat-month": { en: "/seat/mo", ar: "/للمقعد شهريًا" },
};

const sizes = {
  sm: { root: "text-body-sm", amount: "font-medium" },
  md: { root: "text-body", amount: "font-medium" },
  lg: { root: "text-body-sm", amount: "text-h2 font-semibold tracking-tight" },
} as const;

// A price with its currency, billing period and optional struck-through original. Formatting comes from the
// active locale ("$12" / "12 US$") with the Nasaq digit set, and the figure is isolated so it keeps its order
// inside Arabic text.
interface Props {
  /** The price. 0 renders the free label. */
  amount: number;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Billing period suffix. Default "once" (no suffix). */
  period?: PricePeriod;
  /** The price before a discount, shown struck through after the amount. */
  compareAt?: number;
  /** Shown when `amount` is 0. Default "Free" / "مجاني". */
  freeLabel?: string;
  /** Fraction digits. Default 0 for whole amounts, 2 otherwise. */
  fractionDigits?: number;
  size?: keyof typeof sizes;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { period: "once", size: "md", currency: undefined, compareAt: undefined, freeLabel: undefined, fractionDigits: undefined });
const currency = useCurrency(() => props.currency);
const nq = useNasaq();
const fmt = useFormatNumber();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const s = computed(() => sizes[props.size]);
const money = (value: number) => {
  const digits = props.fractionDigits ?? (Number.isInteger(value) ? 0 : 2);
  return fmt(value, { style: "currency", currency: currency.value, minimumFractionDigits: digits, maximumFractionDigits: digits });
};
</script>

<template>
  <span v-if="props.amount === 0" data-slot="price" data-free="" :class="cn('text-foreground', s.root, props.class)">
    <span :class="s.amount">{{ props.freeLabel ?? (ar ? "مجاني" : "Free") }}</span>
  </span>
  <span v-else data-slot="price" :class="cn('inline-flex flex-wrap items-baseline gap-x-1.5 text-foreground', s.root, props.class)">
    <span>
      <bdi :class="cn('tabular-nums', s.amount)">{{ money(props.amount) }}</bdi>
      <span v-if="props.period !== 'once'" class="text-muted-foreground">{{ PERIOD[props.period][ar ? "ar" : "en"] }}</span>
    </span>
    <s v-if="props.compareAt !== undefined && props.compareAt > props.amount" class="text-caption text-muted-foreground decoration-muted-foreground/60">
      <span class="sr-only">{{ ar ? "بدلًا من " : "was " }}</span>
      <bdi class="tabular-nums">{{ money(props.compareAt) }}</bdi>
    </s>
  </span>
</template>
