<script setup lang="ts">
import { CircleX, Save, Undo2 } from "lucide-vue-next";
import { computed, ref, shallowRef, useId } from "vue";
import { useCurrency } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqCurrencyInput } from "../currency-input";
import { currencyDecimals } from "../currency-input/currency-input-logic";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqNum } from "../numeric";
import { NqRichTextEditor } from "../rich-text-editor";
import type { RichTextTiptap } from "../rich-text-editor/rich-text-editor-logic";
import { NqSeoPreview } from "../seo-preview";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSkeleton } from "../states";
import { NqSwitch } from "../switch";
import { NqTagInput } from "../tag-input";
import NqMediaManager from "./NqMediaManager.vue";
import NqOptionsEditor from "./NqOptionsEditor.vue";
import NqVariantMatrix from "./NqVariantMatrix.vue";
import ProductAdminMoney from "./ProductAdminMoney.vue";
import { DEFAULT_VARIANT_ID, draftChanged, emptyProductDraft, generateVariants, marginFromCost, type ProductDraft, slugify, validateProductDraft } from "./product-admin-logic";
import type { CommerceOption, CommerceVariant } from "./product-types";
import { productFailMessage, useProductAdminStrings, type ProductAdminResult, type StoreProductsAdminLabels } from "./strings";

// The product editor: title and rich description, pictures with reorder and alt text, price with margin from cost,
// inventory, options that build a variant matrix (per-variant price, compare-at, SKU, stock and image, with bulk
// fill), brand, category and tags, a search listing preview, and status and visibility. Save is off until the
// product is valid and has changed. Changing options keeps what you already typed on the variants that remain.
const props = withDefaults(
  defineProps<{
    /** The product to edit. Omit for a new one. Build it with `productToDraft(product, { cost, … })`. */
    initial?: ProductDraft;
    /** ISO 4217 code of the store. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Origin of the storefront, for the search preview URL. */
    siteUrl?: string;
    /** Saves the draft. Resolve `{ error }` to show a message and keep the edits. */
    onSave: (draft: ProductDraft) => Promise<ProductAdminResult>;
    /** Called when the merchant discards edits or leaves without saving. */
    onCancel?: () => void;
    /** Suggestions for the brand, category and tag fields. */
    suggestions?: { brands?: readonly string[]; categories?: readonly string[]; tags?: readonly string[] };
    /** Loads Tiptap for the description: `() => import("./tiptap")`. Until it arrives the toolbar is disabled. */
    loadEditor?: () => Promise<RichTextTiptap>;
    loading?: boolean;
    labels?: StoreProductsAdminLabels;
  }>(),
  { initial: undefined, currency: undefined, siteUrl: "https://store.example", onCancel: undefined, suggestions: undefined, loadEditor: undefined, loading: false, labels: undefined },
);

const currency = useCurrency(() => props.currency);
const { t, n, locale } = useProductAdminStrings(() => props.labels);
const uid = useId();
const base = shallowRef<ProductDraft>(props.initial ?? emptyProductDraft());
const draft = ref<ProductDraft>(base.value);
const touched = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const saved = ref(false);
const note = ref<string | null>(null);
const isNew = !base.value.id;
const decimals = computed(() => currencyDecimals(currency.value));
const STATUSES = ["active", "draft", "archived"] as const;

function set(change: Partial<ProductDraft> | ((d: ProductDraft) => ProductDraft)) {
  saved.value = false;
  draft.value = typeof change === "function" ? change(draft.value) : { ...draft.value, ...change };
}

const hasOptions = computed(() => draft.value.options.some((o) => o.values.length > 0));
const single = computed<CommerceVariant | undefined>(() => draft.value.variants[0]);
function patchSingle(change: Partial<CommerceVariant> | ((v: CommerceVariant) => CommerceVariant)) {
  set((d) => ({ ...d, variants: d.variants.map((v, i) => (i === 0 ? (typeof change === "function" ? change(v) : { ...v, ...change }) : v)) }));
}
function without(v: CommerceVariant, key: "sku" | "weightGrams" | "stock" | "compareAt"): CommerceVariant {
  const { [key]: _drop, ...rest } = v;
  return rest as CommerceVariant;
}
const refPrice = computed(() => (hasOptions.value ? (draft.value.variants.length ? Math.min(...draft.value.variants.map((v) => v.price)) : null) : (single.value?.price ?? null)));
const margin = computed(() => marginFromCost(refPrice.value && refPrice.value > 0 ? refPrice.value : null, draft.value.cost));

const skuBase = computed(() => (draft.value.slug || slugify(draft.value.title)).toUpperCase().slice(0, 12) || undefined);
function changeOptions(options: CommerceOption[]) {
  set((d) => {
    const axes = options.filter((o) => o.values.length > 0);
    if (axes.length === 0) {
      const first = d.variants[0] ?? { id: DEFAULT_VARIANT_ID, options: {}, price: 0 };
      return { ...d, options, variants: [{ ...first, options: {} }] };
    }
    const first = d.variants[0];
    const r = generateVariants(options, d.variants, {
      defaults: { price: first?.price ?? 0, ...(first?.compareAt !== undefined ? { compareAt: first.compareAt } : {}), ...(first?.stock !== undefined ? { stock: first.stock } : {}), ...(first?.weightGrams !== undefined ? { weightGrams: first.weightGrams } : {}) },
      ...(skuBase.value ? { skuBase: skuBase.value } : {}),
    });
    note.value = r.dropped.length ? t.value.variantsRemoved(n(r.dropped.length)) : r.truncated ? t.value.variantsTruncated(n(100)) : null;
    return { ...d, options, variants: r.variants };
  });
}

const issues = computed(() => {
  const d = draft.value;
  const s = single.value;
  return validateProductDraft({
    title: d.title,
    price: isNew && !hasOptions.value && (s?.price ?? 0) <= 0 ? null : (s?.price ?? 0),
    compareAt: s?.compareAt ?? null,
    options: d.options.filter((o) => o.values.length > 0),
    variants: d.variants,
    slug: d.slug,
  });
});
const dirty = computed(() => draftChanged(draft.value, base.value));
const has = (code: string) => issues.value.some((i) => i.code === code);
const issueList = computed(() => [...new Set(issues.value.map((i) => i.code))]);

const seoUrl = computed(() => `${props.siteUrl.replace(/\/$/, "")}/products/${draft.value.slug || slugify(draft.value.title) || "product"}`);
const plain = computed(() => draft.value.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

async function submit() {
  touched.value = true;
  if (issues.value.length > 0 || saving.value) return;
  saving.value = true;
  error.value = null;
  try {
    const r = await props.onSave(draft.value);
    if (r?.error) {
      error.value = r.error;
      return;
    }
    base.value = draft.value;
    saved.value = true;
  } catch (e) {
    error.value = productFailMessage(e, t.value.saveFailed);
  } finally {
    saving.value = false;
  }
}
function discard() {
  if (dirty.value) {
    draft.value = base.value;
    touched.value = false;
    error.value = null;
    note.value = null;
  } else props.onCancel?.();
}
const setStock = (v: string | number | undefined) => patchSingle({ stock: /^\d+$/.test(String(v ?? "").trim()) ? Number(String(v).trim()) : 0 });
const percent = (bps: number) => bps / 10000;
</script>

<template>
  <div v-if="props.loading" data-slot="product-editor" aria-busy="true" class="grid gap-4">
    <NqSkeleton class="h-40 w-full" />
    <NqSkeleton class="h-56 w-full" />
    <NqSkeleton class="h-40 w-full" />
  </div>
  <form v-else data-slot="product-editor" novalidate :aria-label="isNew ? t.newProductTitle : t.editProduct" class="flex min-w-0 flex-col gap-4" @submit.prevent="submit">
    <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="flex min-w-0 flex-col gap-4">
        <NqCard class="w-full">
          <NqCardHeader><NqCardTitle as="h3">{{ t.general }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="grid gap-4">
            <NqField :invalid="touched && has('title')">
              <NqFieldLabel>{{ t.title }}</NqFieldLabel>
              <NqInput :model-value="draft.title" @update:model-value="(v) => set({ title: String(v ?? '') })" />
              <NqFieldError v-if="touched && has('title')" match>{{ t.issues.title }}</NqFieldError>
            </NqField>
            <div class="grid gap-1.5">
              <span :id="`${uid}-desc`" class="text-label text-foreground">{{ t.description }}</span>
              <NqRichTextEditor :aria-labelledby="`${uid}-desc`" :model-value="draft.description" :load="props.loadEditor" min-height="9rem" @update:model-value="(html) => set({ description: String(html) })" />
            </div>
          </NqCardContent>
        </NqCard>

        <NqCard class="w-full">
          <NqCardHeader><NqCardTitle as="h3">{{ t.media }}</NqCardTitle></NqCardHeader>
          <NqCardContent>
            <NqMediaManager :images="draft.images" :on-images-change="(images) => set({ images })" :labels="props.labels" />
          </NqCardContent>
        </NqCard>

        <NqCard class="w-full">
          <NqCardHeader><NqCardTitle as="h3">{{ t.pricing }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="grid gap-4">
            <div v-if="!hasOptions && single" class="grid gap-4 sm:grid-cols-2">
              <NqField :invalid="touched && has('price')">
                <NqFieldLabel>{{ t.price }}</NqFieldLabel>
                <NqCurrencyInput :currency="currency" :model-value="single.price" :aria-label="t.price" @update:model-value="(p) => patchSingle({ price: p ?? 0 })" />
                <NqFieldError v-if="touched && has('price')" match>{{ t.issues.price }}</NqFieldError>
              </NqField>
              <NqField :invalid="has('compare-at')">
                <NqFieldLabel>{{ t.compareAt }}</NqFieldLabel>
                <NqCurrencyInput :currency="currency" :model-value="single.compareAt ?? null" :aria-label="t.compareAt" @update:model-value="(p) => patchSingle((v) => (p === null ? without(v, 'compareAt') : { ...without(v, 'compareAt'), compareAt: p }))" />
                <NqFieldError v-if="has('compare-at')" match>{{ t.issues["compare-at"] }}</NqFieldError>
                <NqFieldDescription v-else>{{ t.compareAtHint }}</NqFieldDescription>
              </NqField>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <NqField>
                <NqFieldLabel>{{ t.cost }}</NqFieldLabel>
                <NqCurrencyInput :currency="currency" :model-value="draft.cost ?? null" :aria-label="t.cost" @update:model-value="(cost) => set({ cost })" />
                <NqFieldDescription>{{ t.costHint }}</NqFieldDescription>
              </NqField>
              <div role="group" :aria-label="t.margin" aria-live="polite" class="grid content-start gap-1 rounded-control border border-border bg-nq-surface-soft p-3">
                <dl v-if="margin" class="grid grid-cols-3 gap-2 text-body-sm">
                  <div>
                    <dt class="text-caption text-muted-foreground">{{ t.profit }}</dt>
                    <dd class="font-medium text-foreground"><ProductAdminMoney :minor="margin.profit" :currency="currency" /></dd>
                  </div>
                  <div>
                    <dt class="text-caption text-muted-foreground">{{ t.margin }}</dt>
                    <dd :class="['font-medium', margin.marginBps < 0 ? 'text-nq-danger-text' : 'text-foreground']"><NqNum :value="percent(margin.marginBps)" :format="{ style: 'percent', maximumFractionDigits: 1 }" /></dd>
                  </div>
                  <div>
                    <dt class="text-caption text-muted-foreground">{{ t.markup }}</dt>
                    <dd class="font-medium text-foreground">
                      <template v-if="margin.markupBps === null">—</template>
                      <NqNum v-else :value="percent(margin.markupBps)" :format="{ style: 'percent', maximumFractionDigits: 1 }" />
                    </dd>
                  </div>
                </dl>
                <p v-else class="text-body-sm text-muted-foreground">{{ t.noMargin }}</p>
              </div>
            </div>
          </NqCardContent>
        </NqCard>

        <NqCard v-if="!hasOptions && single" class="w-full">
          <NqCardHeader><NqCardTitle as="h3">{{ t.inventory }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <NqField :invalid="has('sku-duplicate')">
                <NqFieldLabel>{{ t.sku }}</NqFieldLabel>
                <NqInput ltr class="font-mono uppercase" :model-value="single.sku ?? ''" @update:model-value="(v) => patchSingle((x) => (v ? { ...without(x, 'sku'), sku: String(v) } : without(x, 'sku')))" />
              </NqField>
              <NqField>
                <NqFieldLabel>{{ t.weight }}</NqFieldLabel>
                <NqInput ltr inputmode="numeric" :model-value="single.weightGrams === undefined ? '' : String(single.weightGrams)" @update:model-value="(v) => patchSingle((x) => (/^\d+$/.test(String(v ?? '').trim()) ? { ...without(x, 'weightGrams'), weightGrams: Number(String(v).trim()) } : without(x, 'weightGrams')))" />
              </NqField>
            </div>
            <label class="flex items-center gap-2 text-body-sm">
              <NqSwitch :model-value="single.stock !== undefined" @update:model-value="(on: boolean) => patchSingle((x) => (on ? { ...without(x, 'stock'), stock: 0 } : without(x, 'stock')))" />
              {{ t.trackStock }}
            </label>
            <div v-if="single.stock !== undefined" class="grid gap-4 sm:grid-cols-2">
              <NqField>
                <NqFieldLabel>{{ t.stockQty }}</NqFieldLabel>
                <NqInput ltr inputmode="numeric" :model-value="String(single.stock)" @update:model-value="setStock" />
              </NqField>
              <label class="flex items-center gap-2 self-end pb-2 text-body-sm">
                <NqSwitch :model-value="Boolean(single.allowBackorder)" @update:model-value="(on: boolean) => patchSingle({ allowBackorder: on })" />
                {{ t.backorder }}
              </label>
            </div>
          </NqCardContent>
        </NqCard>

        <NqCard class="w-full">
          <NqCardHeader><NqCardTitle as="h3">{{ t.optionsTitle }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="grid gap-4">
            <NqOptionsEditor :options="draft.options" :on-options-change="changeOptions" :labels="props.labels" />
            <NqAlert v-if="note" tone="warning" role="status" dismissible @dismiss="note = null">{{ note }}</NqAlert>
            <div v-if="hasOptions" class="grid gap-3">
              <div class="flex items-center gap-2">
                <h4 class="text-h4 text-foreground">{{ t.variantsTitle }}</h4>
                <NqBadge variant="neutral">{{ t.variantsSummary(n(draft.variants.length)) }}</NqBadge>
              </div>
              <NqVariantMatrix :options="draft.options.filter((o) => o.values.length > 0)" :variants="draft.variants" :on-variants-change="(variants) => set({ variants })" :currency="currency" :images="draft.images" :labels="props.labels" />
            </div>
          </NqCardContent>
        </NqCard>

        <NqCard class="w-full">
          <NqCardHeader><NqCardTitle as="h3">{{ t.seo }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="grid gap-4">
            <NqField :invalid="has('slug')">
              <NqFieldLabel>{{ t.slug }}</NqFieldLabel>
              <NqInput ltr :model-value="draft.slug" :placeholder="slugify(draft.title)" @update:model-value="(v) => set({ slug: String(v ?? '') })" />
              <NqFieldError v-if="has('slug')" match>{{ t.issues.slug }}</NqFieldError>
              <NqFieldDescription v-else>{{ t.slugHint }}</NqFieldDescription>
            </NqField>
            <NqSeoPreview
              :model-value="{ title: draft.seoTitle || draft.title, description: draft.seoDescription || plain.slice(0, 160), url: seoUrl, ...(draft.images[0] ? { image: draft.images[0].src } : {}) }"
              editable
              @update:model-value="(v) => set({ seoTitle: v.title, seoDescription: v.description })"
            />
          </NqCardContent>
        </NqCard>
      </div>

      <div class="flex min-w-0 flex-col gap-4 lg:self-start">
        <NqCard class="w-full">
          <NqCardHeader><NqCardTitle as="h3">{{ t.statusSection }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="grid gap-4">
            <NqField>
              <NqFieldLabel>{{ t.statusCol }}</NqFieldLabel>
              <NqSelect :model-value="draft.status" @update:model-value="(v) => v && set({ status: String(v) as ProductDraft['status'] })">
                <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="s in STATUSES" :key="s" :value="s">{{ t.statuses[s] }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
              <NqFieldDescription>{{ t.statusHint[draft.status] }}</NqFieldDescription>
            </NqField>
            <NqField>
              <NqFieldLabel>{{ t.visibility }}</NqFieldLabel>
              <NqSelect :model-value="draft.visibility" @update:model-value="(v) => v && set({ visibility: String(v) as ProductDraft['visibility'] })">
                <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem value="visible">{{ t.visible }}</NqSelectItem>
                  <NqSelectItem value="hidden">{{ t.hidden }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
          </NqCardContent>
        </NqCard>

        <NqCard class="w-full">
          <NqCardHeader><NqCardTitle as="h3">{{ t.organization }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="grid gap-4">
            <NqField>
              <NqFieldLabel>{{ t.brand }}</NqFieldLabel>
              <NqInput :model-value="draft.brand" :list="props.suggestions?.brands ? `${uid}-brands` : undefined" @update:model-value="(v) => set({ brand: String(v ?? '') })" />
              <datalist v-if="props.suggestions?.brands" :id="`${uid}-brands`"><option v-for="b in props.suggestions.brands" :key="b" :value="b" /></datalist>
            </NqField>
            <NqField>
              <NqFieldLabel>{{ t.category }}</NqFieldLabel>
              <NqInput :model-value="draft.category" :list="props.suggestions?.categories ? `${uid}-cats` : undefined" @update:model-value="(v) => set({ category: String(v ?? '') })" />
              <datalist v-if="props.suggestions?.categories" :id="`${uid}-cats`"><option v-for="c in props.suggestions.categories" :key="c" :value="c" /></datalist>
            </NqField>
            <NqField>
              <NqFieldLabel :id="`${uid}-tags`">{{ t.tags }}</NqFieldLabel>
              <NqTagInput :aria-labelledby="`${uid}-tags`" :model-value="draft.tags" :placeholder="t.tagsPlaceholder" :suggestions="props.suggestions?.tags" @update:model-value="(tags) => set({ tags })" />
            </NqField>
          </NqCardContent>
        </NqCard>
      </div>
    </div>

    <div data-slot="product-editor-bar" class="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
      <div class="min-w-0 text-body-sm" role="status" aria-live="polite">
        <span v-if="error" class="flex items-center gap-2 text-nq-danger-text">
          <CircleX aria-hidden="true" class="size-4 shrink-0" />
          {{ error }}
        </span>
        <span v-else-if="touched && issueList.length > 0" class="text-nq-danger-text">{{ t.fixIssues(n(issueList.length)) }}: {{ issueList.map((c) => t.issues[c]).join(" ") }}</span>
        <span v-else-if="dirty" class="text-nq-warning-text">{{ t.unsaved }}</span>
        <span v-else-if="saved" class="text-nq-success-text">{{ t.allSaved }}</span>
      </div>
      <div class="flex gap-2">
        <NqButton type="button" variant="ghost" :disabled="saving || (!dirty && !props.onCancel)" @click="discard">
          <Undo2 aria-hidden="true" />
          {{ t.discard }}
        </NqButton>
        <NqButton type="submit" variant="primary" :loading="saving" :disabled="!dirty && !isNew">
          <Save aria-hidden="true" />
          {{ saving ? t.saving : t.save }}
        </NqButton>
      </div>
    </div>
    <span hidden :data-decimals="decimals" :data-locale="locale" />
  </form>
</template>
