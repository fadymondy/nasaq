<script setup lang="ts">
import { Layers, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqContextMenuActions } from "../context-menu";
import { currencyDecimals } from "../currency-input/currency-input-logic";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { ruleUid } from "../rule-builder/rule-model";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import ProductAdminThumb from "./ProductAdminThumb.vue";
import ProductCollectionEditor from "./ProductCollectionEditor.vue";
import { type CollectionDef, matchCollection } from "./product-admin-logic";
import type { CommerceProduct } from "./product-types";
import { productFailMessage, useProductAdminStrings, type ProductAdminResult, type StoreProductsAdminLabels } from "./strings";

// The collections of the store: each is manual (products picked and ordered by hand) or rule-based (a rule builder
// condition tree over tag, brand, category, title, price, stock, sale and status). While you edit, the products that
// match are listed live, so a rule is checked before it is saved. Rule prices are typed in major units.
const props = withDefaults(
  defineProps<{
    collections: readonly CollectionDef[];
    /** The whole catalogue, for the manual picker and the live match preview. */
    products: readonly CommerceProduct[];
    /** ISO 4217 code. Prices in rules are typed in major units of it. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Saves a new or changed collection. New ones arrive with a fresh `id`. Resolve `{ error }` to keep the editor open. */
    onSave: (collection: CollectionDef) => Promise<ProductAdminResult>;
    onDelete?: (collection: CollectionDef) => Promise<ProductAdminResult>;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    labels?: StoreProductsAdminLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { currency: undefined, onDelete: undefined, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const currency = useCurrency(() => props.currency);
const { t, n } = useProductAdminStrings(() => props.labels);
const minorPerMajor = computed(() => 10 ** currencyDecimals(currency.value));
const editing = ref<CollectionDef | null>(null);
const deleting = ref<CollectionDef | null>(null);
const busy = ref(false);
const notice = ref<string | null>(null);

async function guard(fn: () => Promise<ProductAdminResult>): Promise<boolean> {
  busy.value = true;
  notice.value = null;
  try {
    const r = await fn();
    if (r?.error) {
      notice.value = r.error;
      return false;
    }
    return true;
  } catch (e) {
    notice.value = productFailMessage(e, t.value.saveFailed);
    return false;
  } finally {
    busy.value = false;
  }
}

const matched = (c: CollectionDef) => matchCollection(props.products, c, { minorPerMajor: minorPerMajor.value });
function openEditor(c: CollectionDef) {
  notice.value = null;
  editing.value = c;
}
const create = () => openEditor({ id: ruleUid("col"), title: "", kind: "manual", productIds: [] });
function actionsOf(c: CollectionDef) {
  return [
    { id: "edit", label: t.value.edit, icon: Pencil, onSelect: () => openEditor(c) },
    ...(props.onDelete
      ? [
          {
            id: "delete",
            label: t.value.delete,
            icon: Trash2,
            danger: true,
            group: "danger",
            onSelect: () => {
              notice.value = null;
              deleting.value = c;
            },
          },
        ]
      : []),
  ];
}
async function saveCollection(c: CollectionDef) {
  if (await guard(() => props.onSave(c))) editing.value = null;
}
async function confirmDelete() {
  const d = deleting.value;
  if (d && props.onDelete && (await guard(() => props.onDelete!(d)))) deleting.value = null;
}
</script>

<template>
  <NqErrorState v-if="props.error" :title="t.loadFailed" :description="props.error">
    <template v-if="props.onRetry" #actions>
      <NqButton size="sm" variant="secondary" @click="props.onRetry">{{ t.retry }}</NqButton>
    </template>
  </NqErrorState>
  <div v-else-if="props.loading" aria-busy="true" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <NqSkeleton v-for="i in 3" :key="i" class="h-28 w-full" />
  </div>
  <section v-else data-slot="collections-manager" :aria-label="t.collectionsLabel" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-h3 text-foreground">{{ t.collections }}</h2>
      <NqButton variant="primary" @click="create">
        <Plus aria-hidden="true" />
        {{ t.newCollection }}
      </NqButton>
    </div>

    <p v-if="notice && !editing && !deleting" role="alert" class="text-body-sm text-nq-danger-text">{{ notice }}</p>

    <NqEmptyState v-if="props.collections.length === 0" :icon="Layers" :title="t.collectionsEmpty" :description="t.collectionsEmptyHint">
      <template #actions>
        <NqButton @click="create">{{ t.newCollection }}</NqButton>
      </template>
    </NqEmptyState>
    <ul v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <li v-for="c in props.collections" :key="c.id" class="min-w-0">
        <NqContextMenuActions :actions="actionsOf(c)" class="h-full rounded-card">
          <NqCard class="h-full w-full">
            <NqCardHeader>
              <NqCardTitle as="h3" class="flex min-w-0 items-center justify-between gap-2">
                <span class="truncate">{{ c.title }}</span>
                <NqBadge :variant="c.kind === 'rules' ? 'info' : 'neutral'">{{ c.kind === "rules" ? t.rules : t.manual }}</NqBadge>
              </NqCardTitle>
            </NqCardHeader>
            <NqCardContent class="grid gap-3">
              <div class="flex -space-x-2 rtl:space-x-reverse" aria-hidden="true">
                <ProductAdminThumb v-for="p in matched(c).slice(0, 5)" :key="p.id" :src="p.images[0]?.src" alt="" :size="32" class="rounded-full ring-2 ring-card" />
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-body-sm text-muted-foreground">{{ t.productsCount(n(matched(c).length)) }}</span>
                <NqButton size="sm" variant="secondary" @click="openEditor(c)">
                  <Pencil aria-hidden="true" />
                  {{ t.edit }}
                </NqButton>
              </div>
            </NqCardContent>
          </NqCard>
        </NqContextMenuActions>
      </li>
    </ul>

    <ProductCollectionEditor
      v-if="editing"
      :key="editing.id"
      :collection="editing"
      :is-new="!props.collections.some((c) => c.id === editing?.id)"
      :products="props.products"
      :currency="currency"
      :minor-per-major="minorPerMajor"
      :busy="busy"
      :error="notice"
      :labels="props.labels"
      @cancel="editing = null"
      @save="saveCollection"
    />

    <NqDialog :open="deleting !== null" @update:open="(o: boolean) => !o && !busy && (deleting = null)">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ t.deleteCollectionTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.deleteCollectionDescription(deleting?.title ?? "") }}</NqDialogDescription>
        </NqDialogHeader>
        <p v-if="notice" role="alert" class="text-body-sm text-nq-danger-text">{{ notice }}</p>
        <NqDialogFooter>
          <NqButton variant="ghost" @click="deleting = null">{{ t.cancel }}</NqButton>
          <NqButton variant="danger" :loading="busy" @click="confirmDelete">{{ t.deleteCollection }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
