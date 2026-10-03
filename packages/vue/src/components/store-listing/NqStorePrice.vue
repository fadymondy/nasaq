<script setup lang="ts">
import { computed } from "vue";
import { useCurrency } from "../../provider";
import { NqPrice } from "../price";
import { currencyDigits, useListingStrings, type ListingLabels } from "./listing-strings";

// A price in integer minor units, formatted for the active locale, with the struck-through original when on sale.
interface Props {
  /** Integer minor units. */
  amount: number;
  compareAt?: number;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Show a "From" prefix. */
  from?: boolean;
  size?: "sm" | "md" | "lg";
  labels?: ListingLabels;
}
const props = withDefaults(defineProps<Props>(), { compareAt: undefined, currency: undefined, from: false, size: "md", labels: undefined });
const currency = useCurrency(() => props.currency);
const { t } = useListingStrings(() => props.labels);
const digits = computed(() => currencyDigits(currency.value));
const major = (n: number) => n / 10 ** digits.value;
</script>

<template>
  <span data-slot="store-price" class="inline-flex flex-wrap items-baseline gap-x-1.5">
    <span v-if="props.from" class="text-caption text-muted-foreground">{{ t.from }}</span>
    <NqPrice :amount="major(props.amount)" :currency="currency" :compare-at="props.compareAt !== undefined ? major(props.compareAt) : undefined" :size="props.size" />
  </span>
</template>
