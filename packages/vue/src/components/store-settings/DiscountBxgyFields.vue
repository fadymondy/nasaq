<script setup lang="ts">
import { useId } from "vue";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import DiscountScopePicker from "./DiscountScopePicker.vue";
import type { CommerceProduct } from "./commerce";
import type { Discount, DiscountScope } from "./discount-logic";
import type { StoreSettingsLabels } from "./strings";
import type { SimCollection } from "./types";
import { useSettingsStrings } from "./use-settings";

type Bxgy = NonNullable<Discount["bxgy"]>;

// The buy X get Y fields of a discount. Internal to the discount editor.
const props = defineProps<{ bxgy: Bxgy; getPct: string; getBps: number | undefined; products: readonly CommerceProduct[]; collections: readonly SimCollection[]; touched: boolean; labels?: StoreSettingsLabels }>();
const emit = defineEmits<{ change: [bxgy: Bxgy]; "update:getPct": [value: string] }>();
const { t } = useSettingsStrings(() => props.labels);
const id = useId();
const toInt = (v: string): number | undefined => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined);
const hasScope = (s?: DiscountScope) => (s?.productIds?.length ?? 0) > 0 || (s?.collectionIds?.length ?? 0) > 0;

const set = (change: Partial<Bxgy>) => emit("change", { ...props.bxgy, ...change });
function clear(key: "maxSets" | "getScope" | "buyScope") {
  const { [key]: _x, ...rest } = props.bxgy;
  emit("change", rest as Bxgy);
}
</script>

<template>
  <div class="grid gap-4" data-slot="bxgy-fields">
    <div class="grid gap-3 sm:grid-cols-2">
      <NqField :invalid="props.touched && props.bxgy.buyQty < 1">
        <NqFieldLabel :for="`${id}-bq`">{{ t.buyQty }}</NqFieldLabel>
        <NqInput :id="`${id}-bq`" ltr inputmode="numeric" :model-value="String(props.bxgy.buyQty)" @update:model-value="(v) => set({ buyQty: toInt(String(v ?? '')) ?? 0 })" />
      </NqField>
      <NqField :invalid="props.touched && props.bxgy.getQty < 1">
        <NqFieldLabel :for="`${id}-gq`">{{ t.getQty }}</NqFieldLabel>
        <NqInput :id="`${id}-gq`" ltr inputmode="numeric" :model-value="String(props.bxgy.getQty)" @update:model-value="(v) => set({ getQty: toInt(String(v ?? '')) ?? 0 })" />
      </NqField>
      <NqField :invalid="props.touched && (props.getBps === undefined || props.getBps < 1)">
        <NqFieldLabel :for="`${id}-gp`">{{ t.getPercent }}</NqFieldLabel>
        <NqInput :id="`${id}-gp`" ltr inputmode="decimal" :model-value="props.getPct" @update:model-value="(v) => emit('update:getPct', String(v ?? ''))" />
        <NqFieldDescription>{{ t.getPercentHint }}</NqFieldDescription>
      </NqField>
      <NqField>
        <NqFieldLabel :for="`${id}-ms`">{{ t.maxSets }}</NqFieldLabel>
        <NqInput
          :id="`${id}-ms`"
          ltr
          inputmode="numeric"
          :model-value="props.bxgy.maxSets === undefined ? '' : String(props.bxgy.maxSets)"
          :placeholder="t.noLimit"
          @update:model-value="(raw) => { const v = toInt(String(raw ?? '')); if (v === undefined || v === 0) clear('maxSets'); else set({ maxSets: v }); }"
        />
      </NqField>
    </div>
    <div class="grid gap-2">
      <p class="text-label text-foreground">{{ t.buyItems }}</p>
      <DiscountScopePicker :value="props.bxgy.buyScope" :products="props.products" :collections="props.collections" :labels="props.labels" @change="(s) => (hasScope(s) ? set({ buyScope: s as DiscountScope }) : clear('buyScope'))" />
    </div>
    <div class="grid gap-2">
      <p class="text-label text-foreground">{{ t.getItems }}</p>
      <DiscountScopePicker :value="props.bxgy.getScope" :products="props.products" :collections="props.collections" :labels="props.labels" :empty-label="t.sameAsBuy" @change="(s) => (hasScope(s) ? set({ getScope: s as DiscountScope }) : clear('getScope'))" />
    </div>
  </div>
</template>
