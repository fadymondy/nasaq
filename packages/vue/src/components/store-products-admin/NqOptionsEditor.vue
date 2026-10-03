<script setup lang="ts">
import { Plus, Trash2 } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqTagInput } from "../tag-input";
import { MAX_OPTIONS, optionValuesFromLabels } from "./product-admin-logic";
import type { CommerceOption } from "./product-types";
import { useProductAdminStrings, type StoreProductsAdminLabels } from "./strings";

// The option axes of a product (Colour, Size, Material) and the values of each. A value you keep typing keeps its
// id, so the variants built on it keep their price, SKU and stock when you add or remove neighbours.
const props = withDefaults(
  defineProps<{
    options: readonly CommerceOption[];
    onOptionsChange: (options: CommerceOption[]) => void;
    /** Default 3. */
    maxOptions?: number;
    disabled?: boolean;
    labels?: StoreProductsAdminLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { maxOptions: MAX_OPTIONS, disabled: false, labels: undefined },
);
const { t } = useProductAdminStrings(() => props.labels);

const update = (id: string, change: (o: CommerceOption) => CommerceOption) => props.onOptionsChange(props.options.map((o) => (o.id === id ? change(o) : o)));
function add() {
  const taken = new Set(props.options.map((o) => o.id));
  let n = props.options.length + 1;
  while (taken.has(`option-${n}`)) n += 1;
  props.onOptionsChange([...props.options, { id: `option-${n}`, name: "", display: "button", values: [] }]);
}
</script>

<template>
  <section data-slot="options-editor" :aria-label="t.optionsTitle" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <p class="text-body-sm text-muted-foreground">{{ t.optionsHint }}</p>
    <div v-for="(o, i) in props.options" :key="o.id" class="grid gap-3 rounded-card border border-border bg-card p-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-start">
      <NqField>
        <NqFieldLabel>{{ t.optionName }}</NqFieldLabel>
        <NqInput :model-value="o.name" :placeholder="t.optionNamePlaceholder" :disabled="props.disabled" @update:model-value="(v) => update(o.id, (x) => ({ ...x, name: String(v ?? '') }))" />
      </NqField>
      <NqField>
        <NqFieldLabel>{{ t.optionValues }}</NqFieldLabel>
        <NqTagInput :model-value="o.values.map((v) => v.label)" :placeholder="t.optionValuesPlaceholder" :disabled="props.disabled" @update:model-value="(next) => update(o.id, (x) => ({ ...x, values: optionValuesFromLabels(x, next) }))" />
      </NqField>
      <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="`${t.removeOption}: ${o.name || i + 1}`" :disabled="props.disabled" class="sm:mt-6" @click="props.onOptionsChange(props.options.filter((x) => x.id !== o.id))">
        <Trash2 aria-hidden="true" />
      </NqButton>
    </div>
    <div v-if="props.options.length < props.maxOptions">
      <NqButton type="button" variant="secondary" size="sm" :disabled="props.disabled" @click="add">
        <Plus aria-hidden="true" />
        {{ t.addOption }}
      </NqButton>
    </div>
  </section>
</template>
