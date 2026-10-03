<script setup lang="ts">
import { computed, ref } from "vue";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqCurrencyInput } from "../currency-input";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqNum } from "../numeric";
import StoreMoney from "./StoreMoney.vue";
import type { StoreSettingsLabels } from "./strings";
import { orderTax, splitTax, taxRateFor, type TaxRate } from "./tax-logic";
import { useSettingsStrings } from "./use-settings";

// Runs the same orderTax a checkout does, on a sample order. Internal to NqTaxSettings.
const props = defineProps<{ rates: readonly TaxRate[]; currency: string; labels?: StoreSettingsLabels }>();
const { t } = useSettingsStrings(() => props.labels);
const country = ref(props.rates.find((r) => r.active !== false)?.country ?? "EG");
const region = ref("");
const goods = ref<number | null>(100000);
const shipping = ref<number | null>(5000);
const active = computed(() => props.rates.filter((r) => r.active !== false));
const rate = computed(() => taxRateFor(active.value, { country: country.value.trim(), ...(region.value.trim() ? { region: region.value.trim() } : {}) }));
const tax = computed(() => orderTax({ goods: goods.value ?? 0, shipping: shipping.value ?? 0, rate: rate.value }));
const split = computed(() => (rate.value ? splitTax((goods.value ?? 0) + (rate.value.onShipping ? (shipping.value ?? 0) : 0), rate.value.bps, rate.value.inclusive) : undefined));
</script>

<template>
  <NqCard class="w-full" data-slot="tax-calculator">
    <NqCardHeader>
      <NqCardTitle as="h3">{{ t.tryTax }}</NqCardTitle>
    </NqCardHeader>
    <NqCardContent class="grid gap-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NqField>
          <NqFieldLabel>{{ t.country }}</NqFieldLabel>
          <NqInput v-model="country" ltr maxlength="2" class="uppercase" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.regionOptional }}</NqFieldLabel>
          <NqInput v-model="region" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.goods }}</NqFieldLabel>
          <NqCurrencyInput v-model="goods" :currency="props.currency" :aria-label="t.goods" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.shippingCharge }}</NqFieldLabel>
          <NqCurrencyInput v-model="shipping" :currency="props.currency" :aria-label="t.shippingCharge" />
        </NqField>
      </div>
      <div role="status" aria-live="polite" class="grid gap-2 rounded-card border border-border bg-nq-surface-soft p-3 text-body-sm">
        <template v-if="rate">
          <p class="text-muted-foreground">
            {{ rate.name }} · <NqNum :value="rate.bps / 10000" :format="{ style: 'percent', maximumFractionDigits: 2 }" /> · {{ rate.inclusive ? t.inclusive : t.exclusive }}
          </p>
          <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <dt class="text-caption text-muted-foreground">{{ t.taxAmount }}</dt>
              <dd class="font-medium text-foreground"><StoreMoney :minor="tax.tax" :currency="props.currency" /></dd>
            </div>
            <div v-if="split">
              <dt class="text-caption text-muted-foreground">{{ t.netAmount }}</dt>
              <dd class="font-medium text-foreground"><StoreMoney :minor="split.net" :currency="props.currency" /></dd>
            </div>
            <div>
              <dt class="text-caption text-muted-foreground">{{ t.addedToTotal }}</dt>
              <dd class="font-medium text-foreground"><StoreMoney :minor="tax.added" :currency="props.currency" /></dd>
            </div>
            <div>
              <dt class="text-caption text-muted-foreground">{{ t.customerPays }}</dt>
              <dd class="font-semibold text-foreground"><StoreMoney :minor="tax.total" :currency="props.currency" /></dd>
            </div>
          </dl>
        </template>
        <p v-else class="text-muted-foreground">{{ t.noTaxRate }}</p>
      </div>
    </NqCardContent>
  </NqCard>
</template>
