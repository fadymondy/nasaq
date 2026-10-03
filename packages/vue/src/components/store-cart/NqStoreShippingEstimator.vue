<script setup lang="ts">
import { CircleAlert } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import { cartCheapestShipping, cartShippingOptions, matchShippingZone, type StoreShippingZone } from "./cart-logic";
import type { CommerceShippingMethod } from "./commerce";
import NqStoreAmount from "./NqStoreAmount.vue";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";
import type { StoreShippingSelection } from "./types";

// Type a city, see the delivery options for it (matched in English or Arabic), and pick one. The picked method feeds
// `NqStoreCartSummary`. Free-over thresholds show how much more to add. `v-model` carries the selection.
interface Props {
  zones: readonly StoreShippingZone[];
  /** Order value before shipping, minor units, for the free-shipping rule. */
  subtotal: number;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  modelValue?: StoreShippingSelection | undefined;
  defaultCity?: string;
  labels?: StoreCartLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, modelValue: undefined, defaultCity: "", labels: undefined });
const emit = defineEmits<{ "update:modelValue": [selection: StoreShippingSelection | undefined] }>();
const currency = useCurrency(() => props.currency);
const { t, n, money } = useStoreCartStrings(() => props.labels);
const city = ref(props.modelValue?.city ?? props.defaultCity);
const searched = ref<string | null>(props.modelValue?.city ?? null);
const listId = useId();
const titleId = useId();
const zone = computed(() => (searched.value ? matchShippingZone(props.zones, searched.value) : undefined));
const options = computed(() => cartShippingOptions(zone.value, props.subtotal));

function etaText(method: CommerceShippingMethod) {
  if (!method.etaDays) return undefined;
  const [a, b] = method.etaDays;
  if (b <= 1 && a <= 1 && a !== b) return t.value.etaToday;
  return t.value.etaDays(n(a), n(b), a === b);
}
function estimate() {
  const text = city.value.trim();
  if (!text) return;
  searched.value = text;
  const found = matchShippingZone(props.zones, text);
  const cheapest = cartCheapestShipping(cartShippingOptions(found, props.subtotal));
  if (found && cheapest) emit("update:modelValue", { city: text, zoneId: found.id, zoneLabel: found.label, method: cheapest.method });
  else emit("update:modelValue", undefined);
}
function pick(id: string | undefined) {
  const picked = options.value.find((o) => o.method.id === id);
  if (picked && searched.value && zone.value) emit("update:modelValue", { city: searched.value, zoneId: zone.value.id, zoneLabel: zone.value.label, method: picked.method });
}
</script>

<template>
  <section data-slot="store-shipping-estimator" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3 rounded-card border border-border bg-card p-4', props.class)">
    <h2 :id="titleId" class="text-h3 font-semibold text-foreground">{{ t.estimateTitle }}</h2>
    <form class="flex items-end gap-2" @submit.prevent="estimate">
      <NqField class="min-w-0 flex-1">
        <NqFieldLabel>{{ t.city }}</NqFieldLabel>
        <NqInput v-model="city" :list="listId" :placeholder="t.cityPlaceholder" autocomplete="address-level2" />
      </NqField>
      <datalist :id="listId">
        <template v-for="z in props.zones" :key="z.id">
          <option v-for="c in z.cities" :key="`${z.id}-${c}`" :value="c" />
        </template>
      </datalist>
      <NqButton type="submit" variant="secondary">{{ t.estimate }}</NqButton>
    </form>
    <div aria-live="polite" class="flex flex-col gap-3">
      <p v-if="searched && !zone" class="flex items-center gap-2 text-body-sm text-nq-warning-text">
        <CircleAlert aria-hidden="true" class="size-4 shrink-0" />
        {{ t.noZone(searched) }}
      </p>
      <template v-if="zone">
        <p class="text-caption text-muted-foreground">{{ t.zoneFound(zone.label) }}</p>
        <NqRadioGroup :aria-label="t.useShipping" :model-value="props.modelValue?.method.id ?? ''" @update:model-value="pick">
          <NqRadioCard v-for="o in options" :key="o.method.id" :value="o.method.id" :title="o.method.label">
            <template #description>
              <span class="flex flex-col gap-0.5">
                <span v-if="etaText(o.method)">{{ etaText(o.method) }}</span>
                <span v-if="!o.free && o.method.freeOver !== undefined">{{ o.remaining !== undefined && o.remaining > 0 ? t.addForFree(money(o.remaining, currency)) : t.freeOver(money(o.method.freeOver, currency)) }}</span>
              </span>
            </template>
            <template #meta>
              <span v-if="o.free" class="text-label text-nq-success-text">{{ t.free }}</span>
              <NqStoreAmount v-else :amount="o.cost" :currency="currency" class="text-label" />
            </template>
          </NqRadioCard>
        </NqRadioGroup>
      </template>
    </div>
  </section>
</template>
