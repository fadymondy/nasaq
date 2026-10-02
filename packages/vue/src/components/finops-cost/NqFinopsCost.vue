<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight, Plus, Receipt, Server, Trash2, TrendingDown } from "lucide-vue-next";
import { computed, h, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency, useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqBreakdownTable } from "../breakdown-table";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTablePagination, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqMetricTiles } from "../metric-tiles";
import { NqNum } from "../numeric";
import { NqMeter } from "../progress";
import { NqEmptyState } from "../states";
import { NqTimeSeriesPanel, type TimeSeriesPoint } from "../time-series-panel";
import NqFinopsAddItemDialog from "./NqFinopsAddItemDialog.vue";
import { budgetState, finopsTotals, monthlyEquivalent, rightsize, roundMoney, type PlanOption, type Rightsize } from "./finops-format";
import { FINOPS_STRINGS, type FinopsCostLabels } from "./strings";
import type { CostItem, CostItemInput, CostServer, FinopsCostResult } from "./types";

// A cost page for the infrastructure: KPI tiles (monthly total against last month, servers, extra items, possible savings),
// a budget meter, a per-server table with price, CPU, memory and disk use and a rightsizing hint, a cost-by-category table,
// an optional history chart and a list of manual line items you can add and remove. Money uses the page locale with Latin
// digits; provider and plan names stay as text.
const props = withDefaults(
  defineProps<{
    servers: readonly CostServer[];
    items?: readonly CostItem[];
    /** ISO 4217 code such as `USD` or `SAR`. Default `USD`, or the provider's. */
    currency?: string;
    /** Last month's total. Adds the change on the total tile. */
    previousTotal?: number;
    /** Monthly budget. Adds a meter and a warning close to it. */
    budget?: number;
    /** Daily cost for a chart: `{ date, cost }`. Left out, no chart shows. */
    history?: readonly TimeSeriesPoint[];
    /** Adds a line item. Without it the add button is hidden. */
    onAddItem?: (input: CostItemInput) => Promise<FinopsCostResult> | FinopsCostResult;
    onRemoveItem?: (id: string) => Promise<FinopsCostResult> | FinopsCostResult;
    /** Applies a rightsizing hint. Without it the row menu has no plan switch. */
    onChangePlan?: (serverId: string, plan: PlanOption) => Promise<FinopsCostResult> | FinopsCostResult;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    labels?: Partial<FinopsCostLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    items: () => [],
    currency: undefined,
    previousTotal: undefined,
    budget: undefined,
    history: undefined,
    onAddItem: undefined,
    onRemoveItem: undefined,
    onChangePlan: undefined,
    loading: false,
    error: undefined,
    onRetry: undefined,
    labels: undefined,
  },
);

const nasaq = useNasaq();
const currency = useCurrency(() => props.currency);
const locale = computed(() => nasaq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed(() => ({ ...FINOPS_STRINGS[ar.value ? "ar" : "en"], ...props.labels }) as FinopsCostLabels);
const money = computed(() => ({ style: "currency" as const, currency: currency.value, maximumFractionDigits: 2 }));
const fmt = (value: number) => new Intl.NumberFormat(ar.value ? "ar-u-nu-latn" : locale.value, money.value).format(value);
const pct0 = (value: number) => new Intl.NumberFormat(ar.value ? "ar-u-nu-latn" : locale.value, { style: "percent", maximumFractionDigits: 0 }).format(value);

const failure = ref<string | null>(null);
const busy = ref<ReadonlySet<string>>(new Set());
let alive = true;
onBeforeUnmount(() => (alive = false));

async function run(key: string, task: () => Promise<FinopsCostResult> | FinopsCostResult) {
  failure.value = null;
  busy.value = new Set([...busy.value, key]);
  try {
    const result = await task();
    if (result && result.error && alive) failure.value = result.error;
  } catch {
    if (alive) failure.value = t.value.genericError;
  } finally {
    if (alive) {
      const next = new Set(busy.value);
      next.delete(key);
      busy.value = next;
    }
  }
}

const hintOf = (server: CostServer): Rightsize => rightsize(server.usage, server.monthlyPrice, server.smallerPlan, server.largerPlan);
const totals = computed(() => finopsTotals(props.servers, props.items));
const savings = computed(() =>
  roundMoney(
    props.servers.reduce((sum, s) => {
      const h = hintOf(s);
      return h.kind === "downsize" ? sum + h.savings : sum;
    }, 0),
  ),
);
const state = computed(() => budgetState(totals.value.total, props.budget));

const removing = ref<CostItem | null>(null);
const held = ref<CostItem | null>(null);
const removePending = ref(false);
watch(removing, (item) => {
  if (item) held.value = item;
});
const addOpen = ref(false);

const dash = () => h("span", { class: "text-muted-foreground" }, "—");

const serverColumns = computed<DataTableColumn<CostServer>[]>(() => {
  const tt = t.value;
  const usageColumn = (id: "cpu" | "memory" | "disk", header: string): DataTableColumn<CostServer> => ({
    id,
    header,
    label: header,
    sortValue: (s) => s.usage[id],
    headerClassName: "min-w-28",
    cell: (s) => h(NqMeter, { size: "sm", "aria-label": `${header}: ${s.name}`, value: s.usage[id], warnAt: 0.85, dangerAt: 0.95, showValue: true, valueText: pct0(s.usage[id] / 100) }),
  });
  return [
    {
      id: "server",
      header: tt.server,
      label: tt.server,
      hideable: false,
      sortValue: (s) => s.name,
      searchValue: (s) => `${s.name} ${s.plan} ${s.region ?? ""}`,
      cell: (s) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("bdi", { dir: "ltr", class: "truncate text-start font-medium text-foreground" }, s.name),
          h("bdi", { dir: "ltr", class: "truncate text-start text-caption text-muted-foreground" }, `${s.plan}${s.region ? ` · ${s.region}` : ""}`),
        ]),
    },
    {
      id: "price",
      header: tt.price,
      label: tt.price,
      align: "end",
      sortValue: (s) => s.monthlyPrice,
      cell: (s) => h("span", { class: "whitespace-nowrap" }, [h(NqNum, { value: s.monthlyPrice, format: money.value }), " ", h("span", { class: "text-caption text-muted-foreground" }, tt.perMonth)]),
    },
    usageColumn("cpu", tt.cpu),
    usageColumn("memory", tt.memory),
    { ...usageColumn("disk", tt.disk), defaultHidden: true },
    {
      id: "hint",
      header: tt.hint,
      label: tt.hint,
      sortValue: (s) => hintOf(s).kind,
      filterValue: (s) => hintOf(s).kind,
      cell: (s) => {
        const hint = hintOf(s);
        if (hint.kind === "ok") return h(NqBadge, { variant: "outline" }, () => tt.hintOk);
        const detail =
          hint.kind === "downsize"
            ? hint.plan && hint.savings > 0
              ? tt.hintDownDetail(hint.plan.name, fmt(hint.savings))
              : tt.hintDownGeneric
            : hint.plan && hint.extra > 0
              ? tt.hintUpDetail(hint.plan.name, fmt(hint.extra))
              : tt.hintUpGeneric;
        return h("div", { class: "flex min-w-0 flex-col items-start gap-1" }, [
          h(NqBadge, { variant: hint.kind === "downsize" ? "success" : "warning" }, () => [
            h(hint.kind === "downsize" ? ArrowDownRight : ArrowUpRight, { "aria-hidden": "true", class: "size-3.5 rtl:-scale-x-100" }),
            hint.kind === "downsize" ? tt.hintDown : tt.hintUp,
          ]),
          h("span", { dir: "auto", class: "max-w-56 text-caption text-muted-foreground" }, detail),
        ]);
      },
    },
  ];
});
const serverTable = useDataTable<CostServer>({ data: () => [...props.servers], columns: serverColumns, getRowId: (s) => s.id, defaultSort: { id: "price", direction: "desc" }, pageSize: 8 });

function serverActions(server: CostServer): DataTableRowAction[] {
  if (!props.onChangePlan) return [];
  const hint = hintOf(server);
  if (hint.kind === "ok" || !hint.plan) return [];
  const plan = hint.plan;
  return [
    {
      id: "change-plan",
      label: t.value.changePlan(plan.name),
      icon: hint.kind === "downsize" ? TrendingDown : ArrowUpRight,
      disabled: busy.value.has(server.id),
      onSelect: () => void run(server.id, () => props.onChangePlan!(server.id, plan)),
    },
  ];
}

const itemColumns = computed<DataTableColumn<CostItem>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "name",
      header: tt.itemName,
      label: tt.itemName,
      hideable: false,
      sortValue: (i) => i.name,
      searchValue: (i) => `${i.name} ${i.category ?? ""}`,
      cell: (i) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { dir: "auto", class: "truncate font-medium text-foreground" }, i.name),
          i.category ? h("span", { dir: "auto", class: "truncate text-caption text-muted-foreground" }, i.category) : null,
        ]),
    },
    { id: "period", header: tt.itemPeriod, label: tt.itemPeriod, sortValue: (i) => i.period, cell: (i) => h(NqBadge, { variant: "outline" }, () => tt.periods[i.period]) },
    { id: "amount", header: tt.itemAmount, label: tt.itemAmount, align: "end", sortValue: (i) => i.amount, cell: (i) => h(NqNum, { value: i.amount, format: money.value }) },
    {
      id: "monthly",
      header: tt.perMonthEquivalent,
      label: tt.perMonthEquivalent,
      align: "end",
      sortValue: (i) => monthlyEquivalent(i),
      cell: (i) => (i.period === "once" ? dash() : h(NqNum, { value: roundMoney(monthlyEquivalent(i)), format: money.value })),
    },
  ];
});
const itemTable = useDataTable<CostItem>({ data: () => [...props.items], columns: itemColumns, getRowId: (i) => i.id, defaultSort: { id: "monthly", direction: "desc" }, pageSize: 8 });

const itemActions = (item: CostItem): DataTableRowAction[] =>
  props.onRemoveItem ? [{ id: "remove", label: t.value.remove, icon: Trash2, danger: true, disabled: busy.value.has(item.id), onSelect: () => (removing.value = item) }] : [];

const categoryRows = computed(() => {
  const map = new Map<string, number>();
  if (totals.value.servers > 0) map.set(t.value.serversCategory, totals.value.servers);
  for (const i of props.items) {
    const m = monthlyEquivalent(i);
    if (m <= 0) continue;
    const key = i.category?.trim() || t.value.uncategorised;
    map.set(key, roundMoney((map.get(key) ?? 0) + m));
  }
  return [...map].map(([label, value]) => ({ id: label, label, value }));
});

const tiles = computed(() => [
  { id: "total", label: t.value.total, value: totals.value.total, previous: props.previousTotal, invert: true, format: money.value },
  { id: "servers", label: t.value.servers, value: totals.value.servers, format: money.value },
  { id: "items", label: t.value.items, value: totals.value.items, format: money.value },
  { id: "savings", label: t.value.savings, value: savings.value, format: money.value },
]);
const historyMetrics = computed(() => [{ id: "cost", label: t.value.cost, format: money.value, aggregate: "sum" as const }]);

async function confirmRemove() {
  const item = held.value;
  if (!item || !props.onRemoveItem) return;
  removePending.value = true;
  try {
    await run(item.id, () => props.onRemoveItem!(item.id));
  } finally {
    removePending.value = false;
    removing.value = null;
  }
}
</script>

<template>
  <div data-slot="finops-cost" :aria-busy="props.loading || undefined" :class="cn('flex w-full flex-col gap-6', props.class)">
    <header class="flex flex-col gap-1">
      <h2 class="text-h3 text-foreground">{{ t.title }}</h2>
      <p class="text-body-sm text-muted-foreground">{{ t.description }}</p>
    </header>

    <NqAlert v-if="failure" tone="danger" dismissible :dismiss-label="t.dismiss" @dismiss="failure = null">{{ failure }}</NqAlert>
    <NqAlert v-if="props.error" tone="danger">
      {{ props.error }}
      <template v-if="props.onRetry" #action>
        <NqButton size="sm" variant="secondary" @click="props.onRetry">{{ t.retry }}</NqButton>
      </template>
    </NqAlert>

    <NqMetricTiles :metrics="tiles" :loading="props.loading" :comparison-label="t.vsPrevious" />

    <NqCard v-if="props.budget !== undefined && props.budget > 0" data-slot="finops-budget" class="w-full">
      <NqCardContent class="flex flex-col gap-3">
        <NqMeter :label="t.budget" :value="totals.total" :max="props.budget" :warn-at="0.9" :danger-at="1" show-value :value-text="t.budgetOf(fmt(totals.total), fmt(props.budget))" />
        <NqAlert v-if="state === 'near'" tone="warning">{{ t.budgetNear }}</NqAlert>
        <NqAlert v-if="state === 'over'" tone="danger">{{ t.budgetOver }}</NqAlert>
      </NqCardContent>
    </NqCard>

    <NqTimeSeriesPanel v-if="props.history && props.history.length > 0" :title="t.historyTitle" :description="t.historyDescription" :metrics="historyMetrics" :data="props.history" />

    <NqCard data-slot="finops-servers" class="w-full">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.serversTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.serversDescription }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-3">
        <NqDataTable
          :table="serverTable"
          :label="t.serversTable"
          :row-label="(s: CostServer) => s.name"
          :loading="props.loading"
          :error="props.error ? t.genericError : undefined"
          :row-actions="props.onChangePlan ? serverActions : undefined"
        >
          <template #empty><NqEmptyState :icon="Server" :title="t.serversEmpty" class="border-0" /></template>
        </NqDataTable>
        <NqDataTablePagination :table="serverTable" />
      </NqCardContent>
    </NqCard>

    <div class="grid w-full gap-6 lg:grid-cols-2">
      <NqBreakdownTable
        class="w-full"
        :title="t.categoryTitle"
        :description="t.categoryDescription"
        :dimension-label="t.category"
        :value-label="t.monthlyCost"
        :format="money"
        :rows="categoryRows"
        :loading="props.loading"
      />
      <NqCard data-slot="finops-items" class="w-full">
        <NqCardHeader>
          <NqCardTitle as="h3">{{ t.itemsTitle }}</NqCardTitle>
          <NqCardDescription>{{ t.itemsDescription }}</NqCardDescription>
          <NqCardAction v-if="props.onAddItem">
            <NqButton size="sm" variant="secondary" @click="addOpen = true">
              <Plus aria-hidden="true" class="size-4" />
              {{ t.addItem }}
            </NqButton>
          </NqCardAction>
        </NqCardHeader>
        <NqCardContent class="flex flex-col gap-3">
          <NqDataTable :table="itemTable" :label="t.itemsTable" :row-label="(i: CostItem) => i.name" :loading="props.loading" :row-actions="props.onRemoveItem ? itemActions : undefined">
            <template #empty><NqEmptyState :icon="Receipt" :title="t.itemsEmpty" :description="t.itemsEmptyBody" class="border-0" /></template>
          </NqDataTable>
          <NqDataTablePagination :table="itemTable" />
        </NqCardContent>
      </NqCard>
    </div>

    <NqFinopsAddItemDialog v-if="props.onAddItem" v-model:open="addOpen" :on-add="props.onAddItem" :t="t" />

    <NqAlertDialog :open="removing !== null" @update:open="(open: boolean) => !open && !removePending && (removing = null)">
      <NqAlertDialogContent data-slot="finops-remove">
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ held ? t.removeTitle(held.name) : null }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.removeBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel :disabled="removePending">{{ t.cancel }}</NqAlertDialogCancel>
          <NqButton variant="danger" :loading="removePending" @click="confirmRemove">{{ t.remove }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
