<script setup lang="ts">
import { Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import {
  NqAlertDialog,
  NqAlertDialogAction,
  NqAlertDialogCancel,
  NqAlertDialogContent,
  NqAlertDialogDescription,
  NqAlertDialogFooter,
  NqAlertDialogHeader,
  NqAlertDialogTitle,
} from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqField, NqFieldError, NqInput } from "../field";
import { NqDateTime } from "../numeric";
import NqDaysLeftBadge from "./NqDaysLeftBadge.vue";
import { byExpiry, certDaysLeft, certStatus, DEFAULT_THRESHOLDS, isValidCertHost, summarizeCerts, type CertThresholds } from "./format";
import { CERT_STRINGS, type CertMonitorLabels } from "./strings";
import type { CertificateRecord, CertResult } from "./types";

// Table of monitored TLS certificates with issuer, expiry date and a days-left badge, soonest first by default.
// Row actions (also on context-click): check again, renew, stop monitoring. Presentational: your callbacks act
// and you pass the updated `certificates` back.
const props = withDefaults(
  defineProps<{
    certificates: readonly CertificateRecord[];
    loading?: boolean;
    thresholds?: CertThresholds;
    /** Override the clock, for tests and stories. */
    now?: Date | number;
    onAdd?: (host: string) => Promise<CertResult>;
    onRecheck?: (id: string) => Promise<CertResult>;
    /** Shows Renew now for certificates that are not auto-renewing. */
    onRenew?: (id: string) => Promise<CertResult>;
    onRemove?: (id: string) => Promise<CertResult>;
    labels?: CertMonitorLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { loading: false, thresholds: () => DEFAULT_THRESHOLDS, now: undefined, onAdd: undefined, onRecheck: undefined, onRenew: undefined, onRemove: undefined, labels: undefined },
);

type Row = CertificateRecord & { days: number | null };

const nasaq = useNasaq();
const t = computed(() => ({ ...CERT_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const host = ref("");
const tried = ref(false);
const adding = ref(false);
const notice = ref<string | null>(null);
const removing = ref<Row | null>(null);

const rows = computed<Row[]>(() => {
  const clock = props.now ?? Date.now();
  return props.certificates
    .map((c) => ({ ...c, days: c.error || !c.validTo ? null : certDaysLeft(c.validTo, clock) }))
    .sort((a, b) => byExpiry(a.days, b.days));
});
const summary = computed(() =>
  summarizeCerts(
    rows.value.map((r) => r.days),
    props.thresholds as CertThresholds,
  ),
);
const attention = computed(() => summary.value.expiring + summary.value.critical + summary.value.expired + summary.value.error);
const hostBad = computed(() => tried.value && !isValidCertHost(host.value));

async function run(fn: () => Promise<CertResult>) {
  notice.value = null;
  try {
    const r = await fn();
    if (r && r.error) notice.value = r.error;
  } catch {
    notice.value = t.value.genericError;
  }
}

async function submit() {
  tried.value = true;
  if (!isValidCertHost(host.value) || !props.onAdd) return;
  adding.value = true;
  await run(() => props.onAdd!(host.value.trim().toLowerCase()));
  adding.value = false;
  host.value = "";
  tried.value = false;
}

const columns = computed<DataTableColumn<Row>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "host",
      header: tt.host,
      label: tt.host,
      sortValue: (r) => r.host,
      searchValue: (r) => `${r.host} ${r.issuer ?? ""}`,
      cell: (r) => h("bdi", { dir: "ltr", class: "font-mono text-body-sm text-foreground" }, r.host),
    },
    {
      id: "issuer",
      header: tt.issuer,
      label: tt.issuer,
      sortValue: (r) => r.issuer,
      cell: (r) => h("span", { class: "text-body-sm text-muted-foreground" }, r.issuer ?? "–"),
      className: "max-md:hidden",
      headerClassName: "max-md:hidden",
    },
    {
      id: "expires",
      header: tt.expires,
      label: tt.expires,
      sortValue: (r) => (r.validTo ? new Date(r.validTo) : null),
      cell: (r) =>
        r.validTo && !r.error ? h(NqDateTime, { value: r.validTo, class: "text-body-sm text-muted-foreground" }) : h("span", { class: "text-body-sm text-nq-danger" }, r.error ?? "–"),
      className: "max-lg:hidden",
      headerClassName: "max-lg:hidden",
    },
    {
      id: "renew",
      header: tt.autoRenew,
      label: tt.autoRenew,
      cell: (r) => h(NqBadge, { variant: "outline" }, () => (r.autoRenew ? tt.autoRenew : tt.manual)),
      className: "max-lg:hidden",
      headerClassName: "max-lg:hidden",
    },
    {
      id: "days",
      header: tt.left,
      label: tt.left,
      sortValue: (r) => r.days ?? Infinity,
      filterValue: (r) => certStatus(r.days, props.thresholds),
      cell: (r) => h(NqDaysLeftBadge, { days: r.days, host: r.host, thresholds: props.thresholds, labels: props.labels }),
      align: "end",
    },
  ];
});
const table = useDataTable({ data: () => rows.value, columns, getRowId: (r) => r.id });

function actions(r: Row): DataTableRowAction[] {
  return [
    ...(props.onRecheck ? [{ id: "recheck", label: t.value.recheck, icon: RefreshCw, group: "run", onSelect: () => void run(() => props.onRecheck!(r.id)) }] : []),
    ...(props.onRenew && !r.autoRenew ? [{ id: "renew", label: t.value.renew, icon: ShieldCheck, group: "run", onSelect: () => void run(() => props.onRenew!(r.id)) }] : []),
    ...(props.onRemove ? [{ id: "remove", label: t.value.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => (removing.value = r) }] : []),
  ];
}

function confirmRemove() {
  if (!removing.value) return;
  const id = removing.value.id;
  removing.value = null;
  if (props.onRemove) void run(() => props.onRemove!(id));
}
</script>

<template>
  <NqCard data-slot="certificate-monitor" :class="cn('w-full', props.class)">
    <NqCardHeader>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqCardTitle as="h3" class="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" class="size-4 text-muted-foreground" />
          {{ t.title }}
        </NqCardTitle>
        <NqBadge :variant="attention ? 'warning' : 'success'">{{ t.summary(summary.total, attention) }}</NqBadge>
      </div>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="grid gap-4">
      <NqDataTableToolbar class="justify-between">
        <NqDataTableSearch :table="table" :placeholder="t.search" />
        <form v-if="props.onAdd" novalidate class="flex items-start gap-2" @submit.prevent="submit">
          <NqField :invalid="hostBad">
            <NqInput v-model="host" ltr :aria-label="t.addLabel" placeholder="app.example.com" />
            <NqFieldError v-if="hostBad" :match="true">{{ t.invalid }}</NqFieldError>
          </NqField>
          <NqButton type="submit" variant="primary" :loading="adding">
            <Plus aria-hidden="true" />
            {{ t.add }}
          </NqButton>
        </form>
      </NqDataTableToolbar>
      <NqAlert v-if="notice" tone="danger" dismissible @dismiss="notice = null">{{ notice }}</NqAlert>
      <NqDataTable :table="table" :label="t.table" :row-label="(r: Row) => r.host" :row-actions="actions" :loading="props.loading" :labels="{ empty: t.empty }" />
    </NqCardContent>
    <NqAlertDialog :open="removing !== null" @update:open="(o: boolean) => !o && (removing = null)">
      <NqAlertDialogContent>
        <template v-if="removing">
          <NqAlertDialogHeader>
            <NqAlertDialogTitle>{{ t.removeTitle(removing.host) }}</NqAlertDialogTitle>
            <NqAlertDialogDescription>{{ t.removeBody }}</NqAlertDialogDescription>
          </NqAlertDialogHeader>
          <NqAlertDialogFooter>
            <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
            <NqAlertDialogAction @click="confirmRemove">{{ t.remove }}</NqAlertDialogAction>
          </NqAlertDialogFooter>
        </template>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </NqCard>
</template>
