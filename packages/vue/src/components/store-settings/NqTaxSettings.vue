<script setup lang="ts">
import { CircleX, Pencil, Percent, Plus, Power, PowerOff, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDataTable, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";
import TaxCalculator from "./TaxCalculator.vue";
import TaxEditor from "./TaxEditor.vue";
import { regionName, uid, type SettingsResult, type StoreSettingsLabels } from "./strings";
import { duplicateTaxRegions, type TaxRate } from "./tax-logic";
import { useAction, useSettingsStrings } from "./use-settings";

// Tax rates by country and region, each either inclusive (the price already contains the tax) or exclusive (added at
// checkout), optionally on shipping too. A calculator below runs the same `orderTax` a checkout does. Rates are basis
// points (1400 is 14%); money is integer minor units.
const props = withDefaults(
  defineProps<{
    rates: readonly TaxRate[];
    /** ISO 4217 code of the store. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Saves a new or changed rate. New rates arrive with a fresh `id`. Resolve `{ error }` to keep the dialog open. */
    onSave: (rate: TaxRate) => Promise<SettingsResult>;
    onDelete?: (rate: TaxRate) => Promise<SettingsResult>;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    labels?: StoreSettingsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { currency: undefined, onDelete: undefined, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const currency = useCurrency(() => props.currency);
const { t, locale } = useSettingsStrings(() => props.labels);
const editing = ref<TaxRate | null>(null);
const deleting = ref<TaxRate | null>(null);
const action = useAction(() => t.value.saveFailed);
const dupes = computed(() => duplicateTaxRegions(props.rates));
const keyOf = (r: { country: string; region?: string }) => `${r.country.toUpperCase()}${r.region ? `/${r.region}` : ""}`;

const columns = computed<DataTableColumn<TaxRate>[]>(() => {
  const tt = t.value;
  return [
    { id: "name", header: tt.taxName, label: tt.taxName, cell: (r) => h("span", { class: "font-medium text-foreground" }, r.name), sortValue: (r) => r.name, searchValue: (r) => `${r.name} ${r.country} ${r.region ?? ""}` },
    {
      id: "region",
      header: tt.region,
      label: tt.region,
      cell: (r) => h("span", { class: "text-body-sm" }, `${regionName(locale.value, r.country)}${r.region ? ` · ${r.region}` : ""}`),
      sortValue: (r) => keyOf(r),
    },
    { id: "rate", header: tt.rate, label: tt.rate, align: "end", cell: (r) => h(NqNum, { value: r.bps / 10000, format: { style: "percent", maximumFractionDigits: 2 } }), sortValue: (r) => r.bps },
    { id: "mode", header: tt.mode, label: tt.mode, cell: (r) => h(NqBadge, { variant: r.inclusive ? "info" : "neutral" }, () => (r.inclusive ? tt.inclusive : tt.exclusive)), sortValue: (r) => Number(r.inclusive) },
    { id: "shipping", header: tt.onShipping, label: tt.onShipping, defaultHidden: true, cell: (r) => (r.onShipping ? tt.yes : tt.no), sortValue: (r) => Number(Boolean(r.onShipping)) },
    { id: "status", header: tt.statusCol, label: tt.statusCol, cell: (r) => h(NqStatus, { tone: r.active === false ? "neutral" : "success" }, () => (r.active === false ? tt.off : tt.on)), sortValue: (r) => Number(r.active !== false) },
  ];
});
const table = useDataTable({ data: () => [...props.rates], columns, getRowId: (r) => r.id, pageSize: 10, defaultSort: { id: "region", direction: "asc" } });

function openEditor(r: TaxRate) {
  action.error.value = null;
  editing.value = r;
}
const create = () => openEditor({ id: uid("tax"), name: "", country: "EG", bps: 1400, inclusive: true, onShipping: true, active: true });
function rowActions(r: TaxRate): DataTableRowAction[] {
  const tt = t.value;
  return [
    { id: "edit", label: tt.edit, icon: Pencil, onSelect: () => openEditor(r) },
    { id: "toggle", label: r.active === false ? tt.enable : tt.disable, icon: r.active === false ? Power : PowerOff, group: "state", onSelect: () => void action.run(() => props.onSave({ ...r, active: r.active === false })) },
    ...(props.onDelete ? [{ id: "delete", label: tt.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => ((action.error.value = null), (deleting.value = r)) }] : []),
  ];
}
async function save(r: TaxRate) {
  if (await action.run(() => props.onSave(r))) editing.value = null;
}
async function confirmDelete() {
  const d = deleting.value;
  if (d && props.onDelete && (await action.run(() => props.onDelete!(d)))) deleting.value = null;
}
</script>

<template>
  <section data-slot="tax-settings" :aria-label="t.taxes" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-h3 text-foreground">{{ t.taxRates }}</h2>
      <NqButton variant="primary" @click="create">
        <Plus aria-hidden="true" />
        {{ t.addTax }}
      </NqButton>
    </div>
    <NqAlert v-if="dupes.length > 0" tone="warning" :title="t.taxOverlapTitle">{{ t.taxOverlapBody(dupes.join(", ")) }}</NqAlert>
    <p v-if="action.error.value && !editing && !deleting" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
      <CircleX aria-hidden="true" class="size-4" />
      {{ action.error.value }}
    </p>
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="t.searchTax" />
    </NqDataTableToolbar>
    <NqDataTable :table="table" :label="t.taxRates" :row-label="(r: TaxRate) => r.name" :loading="props.loading" :error="props.error" :on-retry="props.onRetry" :on-row-click="openEditor" :row-actions="rowActions">
      <template #empty>
        <NqEmptyState :icon="Percent" :title="t.taxEmpty" :description="t.taxEmptyHint" class="border-0">
          <template #actions>
          <NqButton size="sm" @click="create">{{ t.addTax }}</NqButton>
          </template>
        </NqEmptyState>
      </template>
    </NqDataTable>

    <TaxCalculator :rates="props.rates" :currency="currency" :labels="props.labels" />

    <TaxEditor
      v-if="editing"
      :key="editing.id"
      :rate="editing"
      :is-new="!props.rates.some((r) => r.id === editing?.id)"
      :busy="action.busy.value"
      :error="action.error.value"
      :labels="props.labels"
      @cancel="editing = null"
      @save="save"
    />

    <NqDialog :open="deleting !== null" @update:open="(o: boolean) => !o && !action.busy.value && (deleting = null)">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ t.deleteTaxTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.deleteBody(deleting?.name ?? "") }}</NqDialogDescription>
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
