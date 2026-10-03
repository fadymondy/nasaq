<script setup lang="ts">
import { Store, Truck } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqCurrencyInput } from "../currency-input";
import { NqField, NqFieldLabel, NqInput } from "../field";
import StoreMoney from "./StoreMoney.vue";
import { resolveShippingOptions, type PickupLocation, type ShippingZone } from "./shipping-logic";
import type { StoreSettingsLabels } from "./strings";
import { useSettingsStrings } from "./use-settings";

// Runs the resolver checkout uses, so a merchant sees what a customer would be offered. Internal to NqShippingSettings.
const props = defineProps<{ zones: readonly ShippingZone[]; pickups: readonly PickupLocation[]; currency: string; labels?: StoreSettingsLabels }>();
const { t } = useSettingsStrings(() => props.labels);
const toInt = (v: string): number | undefined => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined);
const country = ref(props.zones.flatMap((z) => z.countries).find((c) => c !== "*") ?? "EG");
const city = ref("");
const subtotal = ref<number | null>(50000);
const grams = ref("800");
const result = computed(() => resolveShippingOptions(props.zones, props.pickups, { country: country.value.trim(), ...(city.value.trim() ? { city: city.value.trim() } : {}) }, { subtotal: subtotal.value ?? 0, weightGrams: toInt(grams.value) ?? 0 }));
const validCountry = computed(() => /^[A-Za-z]{2}$/.test(country.value.trim()));
</script>

<template>
  <NqCard class="w-full" data-slot="shipping-tester">
    <NqCardHeader>
      <NqCardTitle as="h3">{{ t.tryDestination }}</NqCardTitle>
    </NqCardHeader>
    <NqCardContent class="grid gap-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NqField>
          <NqFieldLabel>{{ t.country }}</NqFieldLabel>
          <NqInput v-model="country" ltr maxlength="2" class="uppercase" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.city }}</NqFieldLabel>
          <NqInput v-model="city" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.cartTotal }}</NqFieldLabel>
          <NqCurrencyInput v-model="subtotal" :currency="props.currency" :aria-label="t.cartTotal" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.cartWeight }}</NqFieldLabel>
          <NqInput v-model="grams" ltr inputmode="numeric" />
        </NqField>
      </div>
      <div role="status" aria-live="polite" class="grid gap-2 rounded-card border border-border bg-nq-surface-soft p-3">
        <p class="text-body-sm text-muted-foreground">{{ !validCountry ? t.countryHint : result.zone ? t.servedBy(result.zone.name) : t.noZone }}</p>
        <ul v-if="result.options.length > 0" class="grid gap-1.5">
          <li v-for="o in result.options" :key="o.id" class="flex min-w-0 flex-wrap items-center justify-between gap-2 text-body-sm">
            <span class="flex min-w-0 items-center gap-2">
              <Store v-if="o.kind === 'pickup'" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
              <Truck v-else aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
              <span class="truncate font-medium text-foreground">{{ o.label }}</span>
              <NqBadge v-if="o.kind === 'express'" variant="accent">{{ t.express }}</NqBadge>
              <NqBadge v-if="o.kind === 'pickup'" variant="neutral">{{ t.pickupBadge }}</NqBadge>
            </span>
            <span class="flex items-center gap-2">
              <span v-if="o.etaDays" class="text-caption text-muted-foreground">{{ t.etaDays(o.etaDays[0], o.etaDays[1]) }}</span>
              <span class="font-medium text-foreground">
                <template v-if="o.free">{{ t.free }}</template>
                <StoreMoney v-else :minor="o.amount" :currency="props.currency" />
              </span>
            </span>
          </li>
        </ul>
        <p v-else-if="validCountry" class="text-body-sm text-nq-danger-text">{{ t.noOptions }}</p>
        <ul v-if="result.hidden.length > 0" class="grid gap-0.5 border-t border-border pt-2 text-caption text-muted-foreground">
          <li v-for="h in result.hidden" :key="h.rateId">
            {{ result.zone?.rates.find((r) => r.id === h.rateId)?.label }}: {{ t.unavailable[h.reason] }}
            <template v-if="h.remaining !== undefined"> · {{ t.spendMore }} <StoreMoney :minor="h.remaining" :currency="props.currency" /></template>
          </li>
        </ul>
      </div>
    </NqCardContent>
  </NqCard>
</template>
