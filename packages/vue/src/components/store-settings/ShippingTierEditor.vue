<script setup lang="ts">
import { Plus, Trash2 } from "lucide-vue-next";
import { computed } from "vue";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { tierIssues, type ShippingTier } from "./shipping-logic";
import type { StoreSettingsLabels } from "./strings";
import { useSettingsStrings } from "./use-settings";

// The weight or price table of one rate. Internal to the zone editor.
const props = defineProps<{ type: "weight" | "price"; tiers: ShippingTier[]; currency: string; labels?: StoreSettingsLabels; showIssues: boolean }>();
const emit = defineEmits<{ change: [tiers: ShippingTier[]] }>();
const { t, n } = useSettingsStrings(() => props.labels);
const issues = computed(() => tierIssues(props.tiers));
const unit = computed(() => (props.type === "weight" ? t.value.grams : ""));
const toInt = (v: string): number | undefined => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined);

function set(i: number, change: Partial<ShippingTier> | ((x: ShippingTier) => ShippingTier)) {
  emit(
    "change",
    props.tiers.map((x, k) => (k === i ? (typeof change === "function" ? change(x) : { ...x, ...change }) : x)),
  );
}
function setMax(i: number, v: number | undefined) {
  set(i, (x) => {
    const { max: _m, ...rest } = x;
    return v === undefined ? rest : { ...rest, max: v };
  });
}
function add() {
  const sorted = [...props.tiers].sort((a, b) => a.min - b.min);
  const last = sorted[sorted.length - 1];
  const start = last ? (last.max ?? last.min + (props.type === "weight" ? 1000 : 10000)) : 0;
  emit("change", [...sorted.map((x, i) => (i === sorted.length - 1 && x.max === undefined ? { ...x, max: start } : x)), { min: start, amount: 0 }]);
}
</script>

<template>
  <div class="grid gap-2" data-slot="tier-editor">
    <p class="text-label text-foreground">{{ props.type === "weight" ? t.weightTiers : t.priceTiers }}</p>
    <ul class="grid gap-2">
      <li v-for="(tier, i) in props.tiers" :key="i" class="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <NqField>
          <NqFieldLabel class="text-caption">{{ t.tierFrom }}</NqFieldLabel>
          <NqInput v-if="props.type === 'weight'" ltr inputmode="numeric" :aria-label="`${t.tierFrom} ${unit}`" :model-value="String(tier.min)" @update:model-value="(v) => set(i, { min: toInt(String(v)) ?? 0 })" />
          <NqCurrencyInput v-else :currency="props.currency" :model-value="tier.min" :aria-label="t.tierFrom" @update:model-value="(v: number | null) => set(i, { min: v ?? 0 })" />
        </NqField>
        <NqField>
          <NqFieldLabel class="text-caption">{{ t.tierTo }}</NqFieldLabel>
          <NqInput v-if="props.type === 'weight'" ltr inputmode="numeric" :aria-label="`${t.tierTo} ${unit}`" :model-value="tier.max === undefined ? '' : String(tier.max)" :placeholder="t.andAbove" @update:model-value="(v) => setMax(i, toInt(String(v)))" />
          <NqCurrencyInput v-else :currency="props.currency" :model-value="tier.max ?? null" :aria-label="t.tierTo" :placeholder="t.andAbove" @update:model-value="(v: number | null) => setMax(i, v === null ? undefined : v)" />
        </NqField>
        <NqField class="col-span-2 sm:col-span-1">
          <NqFieldLabel class="text-caption">{{ t.tierPrice }}</NqFieldLabel>
          <NqCurrencyInput :currency="props.currency" :model-value="tier.amount" :aria-label="t.tierPrice" @update:model-value="(v: number | null) => set(i, { amount: v ?? 0 })" />
        </NqField>
        <NqButton type="button" variant="ghost" size="icon" class="justify-self-end" :aria-label="t.removeTier(n(i + 1))" @click="emit('change', props.tiers.filter((_, k) => k !== i))">
          <Trash2 aria-hidden="true" />
        </NqButton>
      </li>
    </ul>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <NqButton type="button" size="sm" variant="secondary" @click="add">
        <Plus aria-hidden="true" />
        {{ t.addTier }}
      </NqButton>
      <p v-if="props.showIssues && issues.length > 0" role="status" class="text-caption text-nq-danger-text">{{ issues.map((x) => t.tierIssues[x]).join(" ") }}</p>
    </div>
    <p v-if="props.type === 'weight'" class="text-caption text-muted-foreground">{{ t.weightUnitHint }}</p>
  </div>
</template>
