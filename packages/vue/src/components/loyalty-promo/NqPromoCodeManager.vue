<script setup lang="ts">
import { CircleX, Copy, Plus, Power, Ticket, Trash2 } from "lucide-vue-next";
import { computed, h, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqDataTable, NqDataTableFacetFilter, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { promoLive } from "./loyalty-logic";
import NqLoyaltyMoney from "./NqLoyaltyMoney.vue";
import NqPromoEditor from "./NqPromoEditor.vue";
import { dayOf, failMessage, todayKey, useLoyaltyStrings, type LoyaltyPromoLabels, type LoyaltyResult } from "./strings";
import type { PromoCode, PromoCodeInput } from "./types";

// Admin list of promo codes with a create and edit dialog. Row actions (edit, copy, turn on or off, delete) open on context-click too.
interface Props {
  promos: readonly PromoCode[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Day key for "live" and "ended". Default today. */
  today?: string;
  /** Creates (no `id`) or updates (with `id`) a code. Resolve `{ error }` to keep the dialog open. */
  onSave: (input: PromoCodeInput, id?: string) => Promise<LoyaltyResult>;
  onSetActive?: (promo: PromoCode, active: boolean) => Promise<LoyaltyResult>;
  onDelete?: (promo: PromoCode) => Promise<LoyaltyResult>;
  loading?: boolean;
  labels?: LoyaltyPromoLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, today: undefined, onSetActive: undefined, onDelete: undefined, loading: false, labels: undefined });
const currency = useCurrency(() => props.currency);
const { t, n } = useLoyaltyStrings(() => props.labels);
const titleId = `nq-promos-${useId()}`;
const editing = ref<PromoCode | "new" | null>(null);
const deleting = ref<PromoCode | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);
const day = () => props.today ?? todayKey();

type PromoStanding = "live" | "scheduled" | "ended" | "off" | "full";
const STANDING_TONE: Record<PromoStanding, StatusTone> = { live: "success", scheduled: "info", ended: "neutral", off: "neutral", full: "warning" };
function promoStanding(p: PromoCode, today: string): PromoStanding {
  if (p.active === false) return "off";
  if (p.endsOn && today > p.endsOn) return "ended";
  if (p.startsOn && today < p.startsOn) return "scheduled";
  if (p.maxRedemptions !== undefined && p.used >= p.maxRedemptions) return "full";
  return promoLive(p, today, p.used) ? "live" : "ended";
}

async function guard(job: () => Promise<LoyaltyResult>): Promise<boolean> {
  busy.value = true;
  error.value = null;
  try {
    const r = await job();
    if (r?.error) {
      error.value = r.error;
      return false;
    }
    return true;
  } catch (e) {
    error.value = failMessage(e, t.value.failed);
    return false;
  } finally {
    busy.value = false;
  }
}

const dayText = (key: string | undefined) => (key ? h(NqDateTime, { value: dayOf(key), format: { dateStyle: "medium" } }) : "…");
const columns = computed<DataTableColumn<PromoCode>[]>(() => [
  {
    id: "code",
    header: t.value.code,
    label: t.value.code,
    cell: (p) => h("bdi", { dir: "ltr", class: "font-mono text-foreground" }, p.code),
    sortValue: (p) => p.code,
    searchValue: (p) => p.code,
  },
  {
    id: "discount",
    header: t.value.discountCol,
    label: t.value.discountCol,
    cell: (p) => (p.type === "percent" ? h("bdi", { dir: "ltr" }, `${n(p.value / 100)}%`) : h(NqLoyaltyMoney, { minor: p.value, currency: currency.value })),
    sortValue: (p) => p.value,
  },
  {
    id: "validity",
    header: t.value.validity,
    label: t.value.validity,
    cell: (p) =>
      p.startsOn || p.endsOn ? h("span", { class: "text-caption" }, [dayText(p.startsOn), " – ", dayText(p.endsOn)]) : h("span", { class: "text-caption text-muted-foreground" }, t.value.unlimited),
    sortValue: (p) => p.endsOn ?? "9999",
  },
  {
    id: "used",
    header: t.value.usesCol,
    label: t.value.usesCol,
    align: "end",
    cell: (p) => h("span", { class: "tabular-nums" }, [n(p.used), p.maxRedemptions !== undefined ? h("span", { class: "text-muted-foreground" }, ` / ${n(p.maxRedemptions)}`) : null]),
    sortValue: (p) => p.used,
  },
  {
    id: "status",
    header: t.value.statusCol,
    label: t.value.statusCol,
    cell: (p) => h(NqStatus, { tone: STANDING_TONE[promoStanding(p, day())] }, () => t.value.statuses[promoStanding(p, day())]),
    sortValue: (p) => promoStanding(p, day()),
    filterValue: (p) => promoStanding(p, day()),
  },
]);
const table = useDataTable({ data: () => props.promos as PromoCode[], columns: () => columns.value, getRowId: (p) => p.id, pageSize: 10, defaultSort: { id: "code", direction: "asc" } });
const standings = computed(() => (["live", "scheduled", "ended", "off", "full"] as const).map((s) => ({ value: s, label: t.value.statuses[s] })));

const openNew = () => {
  error.value = null;
  editing.value = "new";
};
const actions = (p: PromoCode): DataTableRowAction[] => [
  {
    id: "edit",
    label: t.value.edit,
    onSelect: () => {
      error.value = null;
      editing.value = p;
    },
  },
  { id: "copy", label: t.value.copyCode, icon: Copy, onSelect: () => void navigator.clipboard?.writeText(p.code) },
  ...(props.onSetActive
    ? [{ id: "toggle", label: p.active === false ? t.value.activate : t.value.deactivate, icon: Power, group: "state", onSelect: () => void guard(() => props.onSetActive!(p, p.active === false)) }]
    : []),
  ...(props.onDelete
    ? [
        {
          id: "delete",
          label: t.value.delete,
          icon: Trash2,
          danger: true,
          group: "danger",
          onSelect: () => {
            error.value = null;
            deleting.value = p;
          },
        },
      ]
    : []),
];
const rowLabel = (p: PromoCode) => p.code;

async function save(input: PromoCodeInput) {
  const target = editing.value;
  if (!target) return;
  if (await guard(() => props.onSave(input, target === "new" ? undefined : target.id))) editing.value = null;
}
async function confirmDelete() {
  const p = deleting.value;
  if (p && props.onDelete && (await guard(() => props.onDelete!(p)))) deleting.value = null;
}
</script>

<template>
  <section data-slot="promo-code-manager" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 :id="titleId" class="text-h3 text-foreground">{{ t.promos }}</h2>
      <NqButton size="sm" @click="openNew">
        <Plus aria-hidden="true" />
        {{ t.newPromo }}
      </NqButton>
    </div>
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="t.search" />
      <NqDataTableFacetFilter :table="table" column="status" :title="t.statusCol" :options="standings" />
    </NqDataTableToolbar>
    <p v-if="error && !editing && !deleting" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
      <CircleX aria-hidden="true" class="size-4" />
      {{ error }}
    </p>
    <NqDataTable :table="table" :label="t.promoLabel" :row-label="rowLabel" :loading="props.loading" :row-actions="actions">
      <template #empty><NqEmptyState :icon="Ticket" :title="t.noPromos" :description="t.noPromosHint" class="border-0" /></template>
    </NqDataTable>
    <NqPromoEditor v-if="editing" :key="editing === 'new' ? 'new' : editing.id" :promo="editing === 'new' ? null : editing" :currency="currency" :busy="busy" :error="error" :t="t" @cancel="editing = null" @submit="save" />
    <NqDialog :open="deleting !== null" @update:open="(o: boolean) => !o && !busy && (deleting = null)">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ t.deleteTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.deleteDescription(deleting?.code ?? "") }}</NqDialogDescription>
        </NqDialogHeader>
        <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
        <NqDialogFooter>
          <NqButton variant="ghost" @click="deleting = null">{{ t.cancel }}</NqButton>
          <NqButton variant="danger" :loading="busy" @click="confirmDelete">{{ t.delete }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
