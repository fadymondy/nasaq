<script setup lang="ts">
import { CircleX, Copy, Pencil, Plus, Power, PowerOff, Tag, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqDataTable, NqDataTableFacetFilter, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";
import DiscountEditor from "./DiscountEditor.vue";
import NqDiscountSimulator from "./NqDiscountSimulator.vue";
import StoreMoney from "./StoreMoney.vue";
import type { CommerceProduct } from "./commerce";
import { discountStanding, duplicateDiscountCodes, type Discount, type DiscountKind, type DiscountStanding } from "./discount-logic";
import { uid, type SettingsResult, type StoreSettingsLabels } from "./strings";
import type { SimCollection } from "./types";
import { useAction, useSettingsStrings } from "./use-settings";

// Discounts: automatic or by code; percentage, fixed amount, buy X get Y and free shipping; with a minimum spend or
// quantity, who may use it, a schedule, usage limits, a cap, and which other discounts it may stack with. A basket
// simulator runs the real evaluator. Money is integer minor units and percentages are basis points.
const props = withDefaults(
  defineProps<{
    discounts: readonly Discount[];
    /** ISO 4217 code of the store. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** For scope pickers and the simulator. */
    products?: readonly CommerceProduct[];
    collections?: readonly SimCollection[];
    /** Customer segments offered in the eligibility field, such as "vip". */
    segments?: readonly string[];
    /** Times each discount has been used, by discount id. Drives "used up" and the Used column. */
    usage?: Readonly<Record<string, number>>;
    /** Today. Defaults to the current time; pass a fixed date for tests and stories. */
    now?: Date;
    /** Saves a new or changed discount. New ones arrive with a fresh `id`. Resolve `{ error }` to keep the editor open. */
    onSave: (discount: Discount) => Promise<SettingsResult>;
    onDelete?: (discount: Discount) => Promise<SettingsResult>;
    /** Show or hide the "try a basket" panel. Default true when `products` is given. */
    simulator?: boolean;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    labels?: StoreSettingsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { currency: undefined, products: () => [], collections: () => [], segments: () => [], usage: () => ({}), now: undefined, onDelete: undefined, simulator: undefined, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const KINDS: DiscountKind[] = ["percentage", "fixed", "bxgy", "free-shipping"];
const STANDINGS: DiscountStanding[] = ["live", "scheduled", "ended", "off", "used-up"];
const STANDING_TONE = { live: "success", scheduled: "info", ended: "neutral", off: "neutral", "used-up": "warning" } as const;

const currency = useCurrency(() => props.currency);
const { t, n } = useSettingsStrings(() => props.labels);
const today = computed(() => props.now ?? new Date());
const editing = ref<Discount | null>(null);
const deleting = ref<Discount | null>(null);
const action = useAction(() => t.value.saveFailed);
const dupes = computed(() => duplicateDiscountCodes(props.discounts));
const standing = (d: Discount) => discountStanding(d, today.value, props.usage[d.id] ?? 0);

function valueOf(d: Discount) {
  const tt = t.value;
  switch (d.kind) {
    case "percentage":
      return h(NqNum, { value: (d.value ?? 0) / 10000, format: { style: "percent", maximumFractionDigits: 2 } });
    case "fixed":
      return h("span", [h(StoreMoney, { minor: d.value ?? 0, currency: currency.value }), d.perItem ? ` ${tt.perItemShort}` : ""]);
    case "bxgy":
      return tt.bxgyShort(n(d.bxgy?.buyQty ?? 0), n(d.bxgy?.getQty ?? 0));
    case "free-shipping":
      return tt.freeShipping;
  }
}

const columns = computed<DataTableColumn<Discount>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "title",
      header: tt.discountTitle,
      label: tt.discountTitle,
      cell: (d) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { class: "truncate font-medium text-foreground" }, d.title),
          d.method === "code" && d.code ? h("bdi", { dir: "ltr", class: "truncate font-mono text-caption text-muted-foreground" }, d.code) : h("span", { class: "text-caption text-muted-foreground" }, tt.automatic),
        ]),
      sortValue: (d) => d.title,
      searchValue: (d) => `${d.title} ${d.code ?? ""}`,
    },
    { id: "kind", header: tt.type, label: tt.type, cell: (d) => tt.kinds[d.kind], sortValue: (d) => d.kind, filterValue: (d) => d.kind },
    { id: "value", header: tt.value, label: tt.value, align: "end", cell: valueOf },
    { id: "method", header: tt.method, label: tt.method, defaultHidden: true, cell: (d) => (d.method === "code" ? tt.byCode : tt.automatic), sortValue: (d) => d.method },
    { id: "status", header: tt.statusCol, label: tt.statusCol, cell: (d) => h(NqStatus, { tone: STANDING_TONE[standing(d)] }, () => tt.standings[standing(d)]), sortValue: (d) => standing(d), filterValue: (d) => standing(d) },
    {
      id: "used",
      header: tt.used,
      label: tt.used,
      align: "end",
      cell: (d) => h("span", { class: "tabular-nums" }, `${n(props.usage[d.id] ?? 0)}${d.limits?.total !== undefined ? ` / ${n(d.limits.total)}` : ""}`),
      sortValue: (d) => props.usage[d.id] ?? 0,
    },
  ];
});
const table = useDataTable({ data: () => [...props.discounts], columns, getRowId: (d) => d.id, pageSize: 10, defaultSort: { id: "title", direction: "asc" } });
const kindOptions = computed(() => KINDS.map((k) => ({ value: k, label: t.value.kinds[k] })));
const standingOptions = computed(() => STANDINGS.map((s) => ({ value: s, label: t.value.standings[s] })));

function open(d: Discount) {
  action.error.value = null;
  editing.value = d;
}
const create = () => open({ id: uid("disc"), title: "", method: "automatic", kind: "percentage", value: 1000, active: true, combinesWith: {} });
function rowActions(d: Discount): DataTableRowAction[] {
  const tt = t.value;
  return [
    { id: "edit", label: tt.edit, icon: Pencil, onSelect: () => open(d) },
    { id: "copy", label: tt.duplicate, icon: Copy, onSelect: () => open({ ...d, id: uid("disc"), title: tt.copyOf(d.title), ...(d.method === "code" ? { code: "" } : {}), active: false }) },
    { id: "toggle", label: d.active === false ? tt.enable : tt.disable, icon: d.active === false ? Power : PowerOff, group: "state", onSelect: () => void action.run(() => props.onSave({ ...d, active: d.active === false })) },
    ...(props.onDelete ? [{ id: "delete", label: tt.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => ((action.error.value = null), (deleting.value = d)) }] : []),
  ];
}
async function save(d: Discount) {
  if (await action.run(() => props.onSave(d))) editing.value = null;
}
async function confirmDelete() {
  const d = deleting.value;
  if (d && props.onDelete && (await action.run(() => props.onDelete!(d)))) deleting.value = null;
}
</script>

<template>
  <section data-slot="discounts-manager" :aria-label="t.discounts" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-h3 text-foreground">{{ t.discounts }}</h2>
      <NqButton variant="primary" @click="create">
        <Plus aria-hidden="true" />
        {{ t.addDiscount }}
      </NqButton>
    </div>
    <p v-if="dupes.length > 0" role="alert" class="text-body-sm text-nq-warning-text">{{ t.duplicateCodes(dupes.join(", ")) }}</p>
    <p v-if="action.error.value && !editing && !deleting" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
      <CircleX aria-hidden="true" class="size-4" />
      {{ action.error.value }}
    </p>
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="t.searchDiscounts" />
      <NqDataTableFacetFilter :table="table" column="kind" :title="t.type" :options="kindOptions" />
      <NqDataTableFacetFilter :table="table" column="status" :title="t.statusCol" :options="standingOptions" />
    </NqDataTableToolbar>
    <NqDataTable :table="table" :label="t.discounts" :row-label="(d: Discount) => d.title" :loading="props.loading" :error="props.error" :on-retry="props.onRetry" :on-row-click="open" :row-actions="rowActions">
      <template #empty>
        <NqEmptyState :icon="Tag" :title="t.discountsEmpty" :description="t.discountsEmptyHint" class="border-0">
          <template #actions>
            <NqButton size="sm" @click="create">{{ t.addDiscount }}</NqButton>
          </template>
        </NqEmptyState>
      </template>
    </NqDataTable>

    <NqDiscountSimulator v-if="(props.simulator ?? props.products.length > 0) && !props.loading && !props.error" :discounts="props.discounts.filter((d) => d.active !== false)" :products="props.products" :collections="props.collections" :currency="currency" :now="today" :labels="props.labels" />

    <DiscountEditor
      v-if="editing"
      :key="editing.id"
      :discount="editing"
      :is-new="!props.discounts.some((d) => d.id === editing?.id)"
      :others="props.discounts.filter((d) => d.id !== editing?.id)"
      :currency="currency"
      :products="props.products"
      :collections="props.collections"
      :segments="props.segments"
      :busy="action.busy.value"
      :error="action.error.value"
      :labels="props.labels"
      @cancel="editing = null"
      @save="save"
    />

    <NqDialog :open="deleting !== null" @update:open="(o: boolean) => !o && !action.busy.value && (deleting = null)">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ t.deleteDiscountTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.deleteBody(deleting?.title ?? "") }}</NqDialogDescription>
        </NqDialogHeader>
        <p v-if="action.error.value" role="alert" class="text-body-sm text-nq-danger-text">{{ action.error.value }}</p>
        <NqDialogFooter>
          <NqButton variant="ghost" @click="deleting = null">{{ t.cancel }}</NqButton>
          <NqButton variant="danger" :loading="action.busy.value" @click="confirmDelete">{{ t.delete }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
