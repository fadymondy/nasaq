<script setup lang="ts">
import { CircleX } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import ProductAdminMoney from "./ProductAdminMoney.vue";
import { type BulkPriceMode, type BulkStockMode, bulkEditProducts, decimalToMinor, type ProductBulkEdit, stockSummary } from "./product-admin-logic";
import type { CommerceProduct } from "./product-types";
import { productPriceRange, productStatusOf, type ProductAdminStatus } from "./product-view";
import { useProductAdminStrings, type StoreProductsAdminLabels } from "./strings";

// The bulk edit dialog of the product list: price rule, stock rule and status for the selected products, with a
// before and after preview. Internal to NqProductAdminList.
const PRICE_MODES: BulkPriceMode[] = ["set", "increase-percent", "decrease-percent", "increase-amount", "decrease-amount"];
const STOCK_MODES: BulkStockMode[] = ["set", "add", "remove"];
const STATUSES = ["active", "draft", "archived"] as const;

const props = defineProps<{ products: CommerceProduct[]; currency: string; busy: boolean; error: string | null; labels?: StoreProductsAdminLabels }>();
const emit = defineEmits<{ cancel: []; apply: [edit: ProductBulkEdit] }>();
const { t, n } = useProductAdminStrings(() => props.labels);

const priceMode = ref<"keep" | BulkPriceMode>("keep");
const percentText = ref("");
const amount = ref<number | null>(null);
const alsoCompare = ref(false);
const stockMode = ref<"keep" | BulkStockMode>("keep");
const stockText = ref("");
const status = ref<"keep" | ProductAdminStatus>("keep");

const percentMode = computed(() => priceMode.value === "increase-percent" || priceMode.value === "decrease-percent");
const priceValue = computed(() => (priceMode.value === "keep" ? null : percentMode.value ? decimalToMinor(percentText.value, 100) : amount.value));
const stockValue = computed(() => (/^\d+$/.test(stockText.value.trim()) ? Number(stockText.value.trim()) : null));

const edit = computed<ProductBulkEdit>(() => ({
  ...(priceMode.value !== "keep" && priceValue.value !== null ? { price: { mode: priceMode.value, value: priceValue.value, ...(alsoCompare.value ? { compareAt: true } : {}) } } : {}),
  ...(stockMode.value !== "keep" && stockValue.value !== null ? { stock: { mode: stockMode.value, value: stockValue.value } } : {}),
  ...(status.value !== "keep" ? { status: status.value } : {}),
}));
const hasChange = computed(() => Boolean(edit.value.price || edit.value.stock || edit.value.status));
const after = computed(() =>
  hasChange.value
    ? bulkEditProducts(
        props.products,
        props.products.map((p) => p.id),
        edit.value,
      )
    : props.products,
);
const changed = computed(() =>
  props.products
    .map((p, i) => {
      const a = after.value[i] as CommerceProduct;
      return { before: p, after: a, priceB: productPriceRange(p), priceA: productPriceRange(a), stockB: stockSummary(p.variants).total, stockA: stockSummary(a.variants).total };
    })
    .filter((r) => JSON.stringify([r.before.variants, r.before.status]) !== JSON.stringify([r.after.variants, r.after.status])),
);
const shown = computed(() => changed.value.slice(0, 6));
const priceMoved = (r: { priceB: [number, number] | null; priceA: [number, number] | null }) => Boolean(r.priceB && r.priceA && (r.priceB[0] !== r.priceA[0] || r.priceB[1] !== r.priceA[1]));

function submit() {
  if (hasChange.value) emit("apply", edit.value);
}
</script>

<template>
  <NqDialog :open="true" @update:open="(o: boolean) => !o && !props.busy && emit('cancel')">
    <NqDialogContent class="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.bulkTitle(n(props.products.length)) }}</NqDialogTitle>
          <NqDialogDescription>{{ t.bulkDescription }}</NqDialogDescription>
        </NqDialogHeader>

        <fieldset class="grid gap-3 rounded-card border border-border p-3">
          <legend class="px-1 text-label text-foreground">{{ t.bulkPrice }}</legend>
          <div class="grid gap-3 sm:grid-cols-2">
            <NqField>
              <NqFieldLabel>{{ t.bulkPrice }}</NqFieldLabel>
              <NqSelect v-model="priceMode" :disabled="props.busy">
                <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem value="keep">{{ t.keep }}</NqSelectItem>
                  <NqSelectItem v-for="m in PRICE_MODES" :key="m" :value="m">{{ t.priceModes[m] }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
            <NqField v-if="priceMode !== 'keep'">
              <NqFieldLabel>{{ percentMode ? t.percent : t.amount }}</NqFieldLabel>
              <NqInput v-if="percentMode" v-model="percentText" ltr inputmode="decimal" :disabled="props.busy" placeholder="10" />
              <NqCurrencyInput v-else v-model="amount" :currency="props.currency" :disabled="props.busy" :aria-label="t.amount" />
            </NqField>
          </div>
          <label v-if="priceMode !== 'keep'" class="flex items-center gap-2 text-body-sm">
            <NqSwitch v-model="alsoCompare" :disabled="props.busy" />
            {{ t.alsoCompareAt }}
          </label>
        </fieldset>

        <fieldset class="grid gap-3 rounded-card border border-border p-3">
          <legend class="px-1 text-label text-foreground">{{ t.bulkStock }}</legend>
          <div class="grid gap-3 sm:grid-cols-2">
            <NqField>
              <NqFieldLabel>{{ t.bulkStock }}</NqFieldLabel>
              <NqSelect v-model="stockMode" :disabled="props.busy">
                <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem value="keep">{{ t.keep }}</NqSelectItem>
                  <NqSelectItem v-for="m in STOCK_MODES" :key="m" :value="m">{{ t.stockModes[m] }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
            <NqField v-if="stockMode !== 'keep'">
              <NqFieldLabel>{{ t.quantity }}</NqFieldLabel>
              <NqInput v-model="stockText" ltr inputmode="numeric" :disabled="props.busy" placeholder="0" />
            </NqField>
          </div>
        </fieldset>

        <NqField>
          <NqFieldLabel>{{ t.bulkStatus }}</NqFieldLabel>
          <NqSelect v-model="status" :disabled="props.busy">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem value="keep">{{ t.keep }}</NqSelectItem>
              <NqSelectItem v-for="s in STATUSES" :key="s" :value="s">{{ t.statuses[s] }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>

        <section :aria-label="t.preview" aria-live="polite" class="rounded-card border border-border bg-nq-surface-soft p-3">
          <h3 class="mb-2 text-label text-foreground">{{ t.preview }}</h3>
          <p v-if="changed.length === 0" class="text-body-sm text-muted-foreground">{{ t.previewEmpty }}</p>
          <ul v-else class="grid gap-1.5">
            <li v-for="r in shown" :key="r.before.id" class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-sm">
              <span class="min-w-0 flex-1 truncate font-medium text-foreground">{{ t.previewRow(r.before.name) }}</span>
              <span v-if="priceMoved(r) && r.priceB && r.priceA" class="whitespace-nowrap text-muted-foreground">
                <ProductAdminMoney :minor="r.priceB[0]" :currency="props.currency" /> →
                <span class="text-foreground"><ProductAdminMoney :minor="r.priceA[0]" :currency="props.currency" /></span>
              </span>
              <span v-if="r.stockB !== r.stockA" class="whitespace-nowrap tabular-nums text-muted-foreground">
                {{ n(r.stockB) }} → <span class="text-foreground">{{ n(r.stockA) }}</span>
              </span>
              <span v-if="productStatusOf(r.before) !== productStatusOf(r.after)" class="whitespace-nowrap text-muted-foreground">
                {{ t.statuses[productStatusOf(r.before)] }} → <span class="text-foreground">{{ t.statuses[productStatusOf(r.after)] }}</span>
              </span>
            </li>
            <li v-if="changed.length > shown.length" class="text-caption text-muted-foreground">+{{ n(changed.length - shown.length) }}</li>
          </ul>
        </section>

        <p v-if="props.error" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden="true" class="size-4" />
          {{ props.error }}
        </p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="props.busy" @click="emit('cancel')">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="props.busy" :disabled="!hasChange">{{ t.applyToProducts(n(props.products.length)) }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
