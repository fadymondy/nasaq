<script setup lang="ts">
import { Award } from "lucide-vue-next";
import { computed, h, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqDataTable, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqDateTime } from "../numeric";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import NqLoyaltyMoney from "./NqLoyaltyMoney.vue";
import { useLoyaltyStrings, type LoyaltyPromoLabels } from "./strings";
import type { Visit, VisitStatus } from "./types";

// A customer's visits with totals up top: count, total spend, average visit and last visit. Sortable by date, spend and points.
interface Props {
  visits: readonly Visit[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Extra actions per visit, such as "Book again". They open on context-click too. */
  rowActions?: (visit: Visit) => DataTableRowAction[];
  loading?: boolean;
  labels?: LoyaltyPromoLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, rowActions: undefined, loading: false, labels: undefined });
const currency = useCurrency(() => props.currency);
const { t, n } = useLoyaltyStrings(() => props.labels);
const titleId = `nq-visits-${useId()}`;
const VISIT_TONE: Record<VisitStatus, StatusTone> = { completed: "success", "no-show": "danger", cancelled: "neutral" };

const done = computed(() => props.visits.filter((v) => v.status === "completed"));
const total = computed(() => done.value.reduce((s, v) => s + v.spend, 0));
const average = computed(() => (done.value.length ? Math.floor((total.value * 2 + done.value.length) / (done.value.length * 2)) : 0));
const last = computed(() => done.value.reduce<Visit | null>((a, v) => (!a || new Date(v.date) > new Date(a.date) ? v : a), null));

const columns = computed<DataTableColumn<Visit>[]>(() => [
  { id: "date", header: t.value.date, label: t.value.date, cell: (v) => h(NqDateTime, { value: v.date, format: { dateStyle: "medium", timeStyle: "short" } }), sortValue: (v) => new Date(v.date) },
  { id: "place", header: t.value.place, label: t.value.place, cell: (v) => h("span", { class: "text-foreground" }, v.place), sortValue: (v) => v.place, searchValue: (v) => v.place },
  { id: "spend", header: t.value.spend, label: t.value.spend, align: "end", cell: (v) => h(NqLoyaltyMoney, { minor: v.spend, currency: currency.value }), sortValue: (v) => v.spend },
  {
    id: "points",
    header: t.value.earned,
    label: t.value.earned,
    align: "end",
    cell: (v) => h("span", { class: "tabular-nums" }, v.points > 0 ? `+${n(v.points)}` : n(v.points)),
    sortValue: (v) => v.points,
  },
  {
    id: "status",
    header: t.value.statusCol,
    label: t.value.statusCol,
    cell: (v) => h(NqStatus, { tone: VISIT_TONE[v.status] }, () => t.value.visitStatus[v.status]),
    sortValue: (v) => v.status,
    filterValue: (v) => v.status,
  },
]);
const table = useDataTable({ data: () => props.visits as Visit[], columns: () => columns.value, getRowId: (v) => v.id, pageSize: 8, defaultSort: { id: "date", direction: "desc" } });
const rowLabel = (v: Visit) => v.place;
</script>

<template>
  <section data-slot="visit-history" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3', props.class)">
    <h2 :id="titleId" class="text-h3 text-foreground">{{ t.visits }}</h2>
    <NqStatGrid>
      <NqStatCard :label="t.visitCount"><template #value>{{ n(done.length) }}</template></NqStatCard>
      <NqStatCard :label="t.totalSpend"><template #value><NqLoyaltyMoney :minor="total" :currency="currency" /></template></NqStatCard>
      <NqStatCard :label="t.average"><template #value><NqLoyaltyMoney :minor="average" :currency="currency" /></template></NqStatCard>
      <NqStatCard :label="t.lastVisit">
        <template #value><NqDateTime v-if="last" :value="last.date" :format="{ dateStyle: 'medium' }" /><template v-else>—</template></template>
      </NqStatCard>
    </NqStatGrid>
    <NqDataTable :table="table" :label="t.visitLabel" :row-label="rowLabel" :loading="props.loading" :row-actions="props.rowActions">
      <template #empty><NqEmptyState :icon="Award" :title="t.noVisits" :description="t.noVisitsHint" class="border-0" /></template>
    </NqDataTable>
  </section>
</template>
