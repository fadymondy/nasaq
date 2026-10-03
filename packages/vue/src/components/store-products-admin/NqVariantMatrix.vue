<script setup lang="ts">
import { TriangleAlert } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqCurrencyInput } from "../currency-input";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import ProductAdminThumb from "./ProductAdminThumb.vue";
import { bulkFillVariants, duplicateSkus, type VariantPatch, variantLabel } from "./product-admin-logic";
import type { CommerceImage, CommerceOption, CommerceVariant } from "./product-types";
import { useProductAdminStrings, type StoreProductsAdminLabels } from "./strings";

// The variant matrix: one row per combination of the options, with its own price, compare-at price, SKU, stock and
// image. Select rows and fill a price, stock, stock change or SKU prefix into all of them at once. Duplicate SKUs are
// flagged. On a phone each row becomes a card.
const NONE = "__none";
const GRID = "lg:grid-cols-[auto_minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(6rem,0.8fr)_minmax(8rem,1fr)]";

const props = withDefaults(
  defineProps<{
    options: readonly CommerceOption[];
    variants: readonly CommerceVariant[];
    onVariantsChange: (variants: CommerceVariant[]) => void;
    /** Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** The product's pictures, offered as each variant's image. */
    images?: readonly CommerceImage[];
    disabled?: boolean;
    labels?: StoreProductsAdminLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { currency: undefined, images: () => [], disabled: false, labels: undefined },
);

const currency = useCurrency(() => props.currency);
const { t, n } = useProductAdminStrings(() => props.labels);
const selected = ref<ReadonlySet<string>>(new Set());
const emptyFill = () => ({ price: null as number | null, compareAt: null as number | null, stock: "", add: "", sku: "" });
const fill = ref(emptyFill());
const dupes = computed(() => new Set(duplicateSkus(props.variants)));
const ids = computed(() => props.variants.map((v) => v.id));
const all = computed(() => props.variants.length > 0 && ids.value.every((id) => selected.value.has(id)));
const some = computed(() => ids.value.some((id) => selected.value.has(id)));
const selectedCount = computed(() => ids.value.filter((id) => selected.value.has(id)).length);

function patch(id: string, change: Partial<CommerceVariant> | ((v: CommerceVariant) => CommerceVariant)) {
  props.onVariantsChange(props.variants.map((v) => (v.id === id ? (typeof change === "function" ? change(v) : { ...v, ...change }) : v)));
}
const wholeOrNull = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);
const fillPatch = computed<VariantPatch>(() => {
  const f = fill.value;
  const stock = wholeOrNull(f.stock);
  return {
    ...(f.price !== null ? { price: f.price } : {}),
    ...(f.compareAt !== null ? { compareAt: f.compareAt } : {}),
    ...(stock !== null ? { stock } : {}),
    ...(/^-?\d+$/.test(f.add.trim()) ? { stockDelta: Number(f.add.trim()) } : {}),
    ...(f.sku.trim() ? { skuPrefix: f.sku.trim().toUpperCase() } : {}),
  };
});
const canFill = computed(() => some.value && Object.keys(fillPatch.value).length > 0);

function applyFill() {
  props.onVariantsChange(bulkFillVariants(props.variants, selected.value, fillPatch.value));
  fill.value = emptyFill();
}
function toggleAll(c: boolean) {
  selected.value = c ? new Set(ids.value) : new Set();
}
function toggleOne(id: string, c: boolean) {
  const next = new Set(selected.value);
  if (c) next.add(id);
  else next.delete(id);
  selected.value = next;
}
const labelOf = (v: CommerceVariant, idx: number) => variantLabel(props.options, v) || `#${idx + 1}`;
const isDup = (v: CommerceVariant) => Boolean(v.sku && dupes.value.has(v.sku.trim().toUpperCase()));
const badCompare = (v: CommerceVariant) => v.compareAt !== undefined && v.compareAt <= v.price;
const without = (v: CommerceVariant, key: "sku" | "compareAt" | "stock" | "image") => {
  const { [key]: _drop, ...rest } = v;
  return rest as CommerceVariant;
};
</script>

<template>
  <NqEmptyState v-if="props.variants.length === 0" data-slot="variant-matrix" :title="t.variantsTitle" :description="t.variantsEmpty" :class="cn('border-dashed', props.class)" />
  <section v-else data-slot="variant-matrix" :aria-label="t.variantsTitle" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div role="group" :aria-label="t.bulkFill" class="grid gap-3 rounded-card border border-border bg-nq-surface-soft p-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-label text-foreground">{{ t.bulkFill }}</h3>
        <span class="text-caption text-muted-foreground" aria-live="polite">{{ some ? t.variantsSelected(n(selectedCount)) : t.selectVariants }}</span>
      </div>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-5">
        <NqField>
          <NqFieldLabel>{{ t.fillPrice }}</NqFieldLabel>
          <NqCurrencyInput v-model="fill.price" :currency="currency" :disabled="props.disabled || !some" :aria-label="t.fillPrice" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.fillCompare }}</NqFieldLabel>
          <NqCurrencyInput v-model="fill.compareAt" :currency="currency" :disabled="props.disabled || !some" :aria-label="t.fillCompare" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.fillStock }}</NqFieldLabel>
          <NqInput v-model="fill.stock" ltr inputmode="numeric" :disabled="props.disabled || !some" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.fillAddStock }}</NqFieldLabel>
          <NqInput v-model="fill.add" ltr inputmode="numeric" :disabled="props.disabled || !some" placeholder="+10" />
        </NqField>
        <NqField class="col-span-2 md:col-span-1">
          <NqFieldLabel>{{ t.fillSkuPrefix }}</NqFieldLabel>
          <NqInput v-model="fill.sku" ltr class="uppercase" :disabled="props.disabled || !some" />
        </NqField>
      </div>
      <div class="flex flex-wrap gap-2">
        <NqButton type="button" size="sm" :disabled="props.disabled || !canFill" @click="applyFill">{{ t.fillApply }}</NqButton>
        <NqButton type="button" size="sm" variant="ghost" :disabled="!some" @click="selected = new Set()">{{ t.fillClear }}</NqButton>
      </div>
    </div>

    <div :class="cn('hidden items-center gap-3 px-3 text-caption text-muted-foreground lg:grid', GRID)" aria-hidden="true">
      <NqCheckbox :model-value="all" :indeterminate="!all && some" :aria-label="t.selectAll" tabindex="-1" @update:model-value="toggleAll" />
      <span>{{ t.variantLabel }}</span>
      <span>{{ t.skuCol }}</span>
      <span>{{ t.priceCol2 }}</span>
      <span>{{ t.compareCol }}</span>
      <span>{{ t.stockCol2 }}</span>
      <span>{{ t.imageCol }}</span>
    </div>
    <ul class="flex flex-col gap-2">
      <li v-for="(v, idx) in props.variants" :key="v.id" data-slot="variant-row" :class="cn('grid grid-cols-2 items-start gap-3 rounded-card border border-border bg-card p-3 lg:items-center', GRID)">
        <div class="col-span-2 flex items-center gap-3 lg:col-span-2 lg:contents">
          <NqCheckbox :model-value="selected.has(v.id)" :disabled="props.disabled" :aria-label="t.selectVariant(labelOf(v, idx))" @update:model-value="(c: boolean) => toggleOne(v.id, c)" />
          <span class="min-w-0 truncate font-medium text-foreground">{{ labelOf(v, idx) }}</span>
        </div>
        <NqField :invalid="isDup(v)" class="col-span-2 lg:col-span-1">
          <NqFieldLabel class="lg:sr-only">{{ t.skuCol }}</NqFieldLabel>
          <NqInput
            ltr
            class="font-mono uppercase"
            :model-value="v.sku ?? ''"
            :disabled="props.disabled"
            :aria-label="`${t.skuCol}: ${labelOf(v, idx)}`"
            @update:model-value="(val) => patch(v.id, (x) => (val ? { ...without(x, 'sku'), sku: String(val) } : without(x, 'sku')))"
          />
          <span v-if="isDup(v)" class="flex items-center gap-1 text-caption text-nq-danger-text">
            <TriangleAlert aria-hidden="true" class="size-3" />
            {{ t.dupSku }}
          </span>
        </NqField>
        <NqField>
          <NqFieldLabel class="lg:sr-only">{{ t.priceCol2 }}</NqFieldLabel>
          <NqCurrencyInput :model-value="v.price" :currency="currency" :disabled="props.disabled" :aria-label="`${t.priceCol2}: ${labelOf(v, idx)}`" @update:model-value="(p) => patch(v.id, { price: p ?? 0 })" />
        </NqField>
        <NqField :invalid="badCompare(v)">
          <NqFieldLabel class="lg:sr-only">{{ t.compareCol }}</NqFieldLabel>
          <NqCurrencyInput
            :model-value="v.compareAt ?? null"
            :currency="currency"
            :disabled="props.disabled"
            :aria-label="`${t.compareCol}: ${labelOf(v, idx)}`"
            @update:model-value="(p) => patch(v.id, (x) => (p === null ? without(x, 'compareAt') : { ...without(x, 'compareAt'), compareAt: p }))"
          />
        </NqField>
        <NqField>
          <NqFieldLabel class="lg:sr-only">{{ t.stockCol2 }}</NqFieldLabel>
          <NqInput
            ltr
            inputmode="numeric"
            :model-value="v.stock === undefined ? '' : String(v.stock)"
            :placeholder="t.stockLevels.untracked"
            :disabled="props.disabled"
            :aria-label="`${t.stockCol2}: ${labelOf(v, idx)}`"
            @update:model-value="(val) => patch(v.id, (x) => (/^\d+$/.test(String(val ?? '').trim()) ? { ...without(x, 'stock'), stock: Number(String(val).trim()) } : without(x, 'stock')))"
          />
        </NqField>
        <NqField>
          <NqFieldLabel class="lg:sr-only">{{ t.imageCol }}</NqFieldLabel>
          <NqSelect :model-value="v.image ?? NONE" :disabled="props.disabled || props.images.length === 0" @update:model-value="(val) => patch(v.id, (x) => (val && val !== NONE ? { ...without(x, 'image'), image: String(val) } : without(x, 'image')))">
            <NqSelectTrigger :aria-label="`${t.imageCol}: ${labelOf(v, idx)}`"><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem :value="NONE">{{ t.noImage }}</NqSelectItem>
              <NqSelectItem v-for="(im, i) in props.images" :key="im.src" :value="im.src">
                <span class="flex items-center gap-2">
                  <ProductAdminThumb :src="im.src" alt="" :size="20" />
                  {{ im.alt || `#${i + 1}` }}
                </span>
              </NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
      </li>
    </ul>
  </section>
</template>
