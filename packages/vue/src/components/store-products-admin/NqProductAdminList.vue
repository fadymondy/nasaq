<script setup lang="ts">
import { Archive, CircleX, Package, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-vue-next";
import { computed, h, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqDataTable, NqDataTableBulkActions, NqDataTableFacetFilter, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqStatus, type StatusTone } from "../status";
import { NqEmptyState } from "../states";
import ProductAdminMoney from "./ProductAdminMoney.vue";
import ProductAdminThumb from "./ProductAdminThumb.vue";
import ProductBulkEditDialog from "./ProductBulkEditDialog.vue";
import { type ProductBulkEdit, stockSummary, variantCount } from "./product-admin-logic";
import type { CommerceProduct } from "./product-types";
import { productPriceRange, productStatusOf, type ProductAdminStatus } from "./product-view";
import { productFailMessage, useProductAdminStrings, type ProductAdminResult, type StoreProductsAdminLabels } from "./strings";

// The product list of a store admin: thumbnail, status, stock level, price range and variant count, with search,
// status and stock filters, sorting, and bulk edit of price, stock and status for the selected rows.
// Row actions (edit, activate, archive, delete) open on context-click too. Money is integer minor units.
const STATUS_TONE: Record<ProductAdminStatus, StatusTone> = { active: "success", draft: "neutral", archived: "warning" };
const LEVEL_TONE = { in: "success", low: "warning", out: "danger", untracked: "neutral" } as const satisfies Record<string, StatusTone>;

const props = withDefaults(
  defineProps<{
    products: readonly CommerceProduct[];
    /** ISO 4217 code of the store. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Opens the editor: a row click, Enter on a row, or "Edit" in its menu. */
    onOpen?: (product: CommerceProduct) => void;
    onCreate?: () => void;
    /** Applies a bulk edit to the selected products. Resolve `{ error }` to keep the dialog open. Without it the Bulk edit button is not shown. */
    onBulkEdit?: (ids: string[], edit: ProductBulkEdit) => Promise<ProductAdminResult>;
    onStatusChange?: (product: CommerceProduct, status: ProductAdminStatus) => Promise<ProductAdminResult>;
    onDelete?: (product: CommerceProduct) => Promise<ProductAdminResult>;
    /** Stock at or below this counts as low. Default 5. */
    lowStockAt?: number;
    loading?: boolean;
    /** The request failed. `true` shows the standard message; a string shows yours. */
    error?: boolean | string;
    onRetry?: () => void;
    labels?: StoreProductsAdminLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { currency: undefined, onOpen: undefined, onCreate: undefined, onBulkEdit: undefined, onStatusChange: undefined, onDelete: undefined, lowStockAt: 5, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const currency = useCurrency(() => props.currency);
const { t, n } = useProductAdminStrings(() => props.labels);
const titleId = useId();
const bulk = ref(false);
const deleting = ref<CommerceProduct | null>(null);
const busy = ref(false);
const notice = ref<string | null>(null);

async function guard(job: () => Promise<ProductAdminResult>): Promise<boolean> {
  busy.value = true;
  notice.value = null;
  try {
    const r = await job();
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

function priceCell(p: CommerceProduct) {
  const r = productPriceRange(p);
  if (!r) return h("span", { class: "text-muted-foreground" }, "—");
  if (r[0] === r[1]) return h(ProductAdminMoney, { minor: r[0], currency: currency.value });
  return h("span", { class: "whitespace-nowrap" }, [h(ProductAdminMoney, { minor: r[0], currency: currency.value }), " – ", h(ProductAdminMoney, { minor: r[1], currency: currency.value })]);
}

const columns = computed<DataTableColumn<CommerceProduct>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "product",
      header: tt.productCol,
      label: tt.productCol,
      cell: (p) =>
        h("div", { class: "flex min-w-0 items-center gap-3" }, [
          h(ProductAdminThumb, { src: p.images[0]?.src, alt: p.images[0]?.alt ?? p.name, size: 40, label: p.name }),
          h("div", { class: "flex min-w-0 flex-col" }, [
            h("span", { class: "truncate font-medium text-foreground" }, p.name),
            p.brand ? h("span", { class: "truncate text-caption text-muted-foreground" }, p.brand) : null,
          ]),
        ]),
      sortValue: (p) => p.name,
      searchValue: (p) => [p.name, p.brand, p.category, ...(p.tags ?? []), ...p.variants.map((v) => v.sku)].filter(Boolean).join(" "),
    },
    { id: "status", header: tt.statusCol, label: tt.statusCol, cell: (p) => h(NqStatus, { tone: STATUS_TONE[productStatusOf(p)] }, () => tt.statuses[productStatusOf(p)]), sortValue: (p) => productStatusOf(p), filterValue: (p) => productStatusOf(p) },
    {
      id: "stock",
      header: tt.stockCol,
      label: tt.stockCol,
      cell: (p) => {
        const s = stockSummary(p.variants, props.lowStockAt);
        return h("div", { class: "flex flex-col items-start gap-0.5" }, [
          h(NqStatus, { tone: LEVEL_TONE[s.level] }, () => tt.stockLevels[s.level]),
          s.level !== "untracked" ? h("span", { class: "text-caption text-muted-foreground tabular-nums" }, tt.units(n(s.total))) : null,
        ]);
      },
      sortValue: (p) => {
        const s = stockSummary(p.variants, props.lowStockAt);
        return s.level === "untracked" ? Number.MAX_SAFE_INTEGER : s.total;
      },
      filterValue: (p) => stockSummary(p.variants, props.lowStockAt).level,
    },
    {
      id: "category",
      header: tt.categoryCol,
      label: tt.categoryCol,
      cell: (p) => (p.category ? h("span", { class: "text-body-sm" }, p.category) : h("span", { class: "text-muted-foreground" }, "—")),
      sortValue: (p) => p.category ?? "",
      defaultHidden: true,
    },
    {
      id: "variants",
      header: tt.variantsCol,
      label: tt.variantsCol,
      align: "end",
      cell: (p) => h("span", { class: "tabular-nums" }, p.options.length ? n(variantCount(p.options) || p.variants.length) : n(p.variants.length)),
      sortValue: (p) => p.variants.length,
    },
    { id: "price", header: tt.priceCol, label: tt.priceCol, align: "end", cell: (p) => priceCell(p), sortValue: (p) => productPriceRange(p)?.[0] ?? 0 },
  ];
});
const table = useDataTable<CommerceProduct>({
  data: () => props.products as CommerceProduct[],
  columns: () => columns.value,
  getRowId: (p) => p.id,
  pageSize: 10,
  selectable: Boolean(props.onBulkEdit),
  defaultSort: { id: "product", direction: "asc" },
});

function rowActions(p: CommerceProduct): DataTableRowAction[] {
  const st = productStatusOf(p);
  const tt = t.value;
  const change = (s: ProductAdminStatus) => void guard(() => props.onStatusChange!(p, s));
  return [
    ...(props.onOpen ? [{ id: "edit", label: tt.edit, icon: Pencil, onSelect: () => props.onOpen?.(p) }] : []),
    ...(props.onStatusChange
      ? [
          ...(st !== "active" ? [{ id: "activate", label: tt.setActive, icon: Power, group: "state", onSelect: () => change("active") }] : []),
          ...(st === "active" ? [{ id: "draft", label: tt.setDraft, icon: PowerOff, group: "state", onSelect: () => change("draft") }] : []),
          ...(st !== "archived" ? [{ id: "archive", label: tt.archive, icon: Archive, group: "state", onSelect: () => change("archived") }] : []),
        ]
      : []),
    ...(props.onDelete
      ? [
          {
            id: "delete",
            label: tt.delete,
            icon: Trash2,
            danger: true,
            group: "danger",
            onSelect: () => {
              notice.value = null;
              deleting.value = p;
            },
          },
        ]
      : []),
  ];
}

const errorText = computed(() => (props.error === true ? t.value.loadFailed : typeof props.error === "string" ? props.error : undefined));
const statusOptions = computed(() => (["active", "draft", "archived"] as const).map((s) => ({ value: s, label: t.value.statuses[s] })));
const stockOptions = computed(() => (["in", "low", "out", "untracked"] as const).map((s) => ({ value: s, label: t.value.stockLevels[s] })));

function openBulk() {
  notice.value = null;
  bulk.value = true;
}
async function applyBulk(edit: ProductBulkEdit) {
  const ok = await guard(() => props.onBulkEdit!(table.selectedRows.map((p) => p.id), edit));
  if (ok) {
    bulk.value = false;
    table.setSelection(new Set());
  }
}
async function confirmDelete() {
  const d = deleting.value;
  if (d && props.onDelete && (await guard(() => props.onDelete!(d)))) deleting.value = null;
}
</script>

<template>
  <section data-slot="product-list" :aria-labelledby="titleId" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 :id="titleId" class="text-h3 text-foreground">{{ t.products }}</h2>
      <NqButton v-if="props.onCreate" size="sm" @click="props.onCreate">
        <Plus aria-hidden="true" />
        {{ t.newProduct }}
      </NqButton>
    </div>
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="t.searchProducts" />
      <NqDataTableFacetFilter :table="table" column="status" :title="t.statusCol" :options="statusOptions" />
      <NqDataTableFacetFilter :table="table" column="stock" :title="t.stockCol" :options="stockOptions" />
    </NqDataTableToolbar>
    <NqDataTableBulkActions v-if="props.onBulkEdit" :table="table">
      <NqButton size="sm" variant="secondary" @click="openBulk">
        <Pencil aria-hidden="true" />
        {{ t.bulkEdit }}
      </NqButton>
    </NqDataTableBulkActions>
    <p v-if="notice && !bulk && !deleting" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
      <CircleX aria-hidden="true" class="size-4" />
      {{ notice }}
    </p>
    <NqDataTable
      :table="table"
      :label="t.productListLabel"
      :row-label="(p: CommerceProduct) => p.name"
      :loading="props.loading"
      :error="errorText"
      :on-retry="props.onRetry"
      :on-row-click="props.onOpen"
      :row-actions="rowActions"
    >
      <template #empty>
        <NqEmptyState :icon="Package" :title="t.noProducts" :description="t.noProductsHint" class="border-0">
          <template v-if="props.onCreate" #actions>
            <NqButton size="sm" @click="props.onCreate">
              <Plus aria-hidden="true" />
              {{ t.newProduct }}
            </NqButton>
          </template>
        </NqEmptyState>
      </template>
    </NqDataTable>
    <ProductBulkEditDialog v-if="bulk && props.onBulkEdit" :products="table.selectedRows" :currency="currency" :busy="busy" :error="notice" :labels="props.labels" @cancel="bulk = false" @apply="applyBulk" />
    <NqDialog :open="deleting !== null" @update:open="(o: boolean) => !o && !busy && (deleting = null)">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ t.deleteTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.deleteDescription(deleting?.name ?? "") }}</NqDialogDescription>
        </NqDialogHeader>
        <p v-if="notice" role="alert" class="text-body-sm text-nq-danger-text">{{ notice }}</p>
        <NqDialogFooter>
          <NqButton variant="ghost" @click="deleting = null">{{ t.cancel }}</NqButton>
          <NqButton variant="danger" :loading="busy" @click="confirmDelete">{{ t.delete }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
