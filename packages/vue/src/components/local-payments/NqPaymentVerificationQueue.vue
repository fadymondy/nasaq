<script setup lang="ts">
import { Check, CircleX, ExternalLink, Eye, ReceiptText, X } from "lucide-vue-next";
import { computed, h, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { minorToMajor } from "../currency-input";
import { NqDataTable, NqDataTableFacetFilter, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn } from "../data-table";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldLabel, NqTextarea } from "../field";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";
import { localPaymentsStrings, type LocalPaymentsLabels } from "./strings";
import { PAYMENT_STATUS_TONE } from "./tones";
import { paymentErrorMessage, type LocalPaymentsResult, type PaymentSubmission } from "./types";

// The reviewer's side: receipts waiting to be matched with the bank, with Verify, Reject (with a reason) and a receipt link.
const props = withDefaults(
  defineProps<{
    submissions: readonly PaymentSubmission[];
    /** Confirms the money arrived. Resolve `{ error }` or reject to show the message. */
    onVerify: (submission: PaymentSubmission) => Promise<LocalPaymentsResult>;
    /** Rejects the receipt with the reviewer's reason, which the customer sees. */
    onReject: (submission: PaymentSubmission, reason: string) => Promise<LocalPaymentsResult>;
    loading?: boolean;
    labels?: LocalPaymentsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { loading: false, labels: undefined },
);

const nq = useNasaq();
const t = computed(() => localPaymentsStrings(nq.locale.value, props.labels));
const titleId = `nq-payment-queue-${useId()}`;
const rejecting = ref<PaymentSubmission | null>(null);
const reason = ref("");
const busy = ref<string | null>(null);
const error = ref<string | null>(null);
const open = (s: PaymentSubmission) => s.status === "submitted" || s.status === "verifying";

async function run(id: string, job: () => Promise<LocalPaymentsResult>) {
  busy.value = id;
  error.value = null;
  try {
    const result = await job();
    if (result?.error) {
      error.value = result.error;
      return false;
    }
    return true;
  } catch (e) {
    error.value = paymentErrorMessage(e, t.value.failed);
    return false;
  } finally {
    busy.value = null;
  }
}
function startReject(s: PaymentSubmission) {
  reason.value = "";
  rejecting.value = s;
}
async function confirmReject() {
  const target = rejecting.value;
  if (!target || !reason.value.trim()) return;
  if (await run(target.id, () => props.onReject(target, reason.value.trim()))) rejecting.value = null;
}
function closeReject() {
  if (busy.value === null) rejecting.value = null;
}

const columns = computed<DataTableColumn<PaymentSubmission>[]>(() => [
  {
    id: "customer",
    header: t.value.customer,
    label: t.value.customer,
    cell: (s) => h("span", { class: "text-foreground" }, s.customer),
    sortValue: (s) => s.customer,
    searchValue: (s) => `${s.customer} ${s.reference}`,
  },
  { id: "method", header: t.value.methodCol, label: t.value.methodCol, cell: (s) => s.methodName, sortValue: (s) => s.methodName },
  { id: "reference", header: t.value.referenceCol, label: t.value.referenceCol, cell: (s) => h("bdi", { dir: "ltr", class: "font-mono text-caption" }, s.reference) },
  {
    id: "amount",
    header: t.value.amountCol,
    label: t.value.amountCol,
    align: "end",
    cell: (s) => h(NqNum, { value: minorToMajor(s.amount, s.currency), format: { style: "currency", currency: s.currency } }),
    sortValue: (s) => s.amount,
  },
  {
    id: "sent",
    header: t.value.sent,
    label: t.value.sent,
    cell: (s) => h(NqDateTime, { value: s.submittedAt, format: { dateStyle: "medium", timeStyle: "short" } }),
    sortValue: (s) => new Date(s.submittedAt),
  },
  {
    id: "status",
    header: t.value.statusCol,
    label: t.value.statusCol,
    cell: (s) => h(NqStatus, { tone: PAYMENT_STATUS_TONE[s.status] }, () => t.value.statuses[s.status]),
    sortValue: (s) => s.status,
    filterValue: (s) => s.status,
  },
  {
    id: "actions",
    header: () => h("span", { class: "sr-only" }, t.value.statusCol),
    label: t.value.statusCol,
    hideable: false,
    align: "end",
    cell: (s) =>
      open(s)
        ? h("span", { class: "inline-flex gap-1" }, [
            h(
              NqButton,
              { size: "icon-sm", variant: "ghost", "aria-label": `${t.value.verify}: ${s.customer}`, loading: busy.value === s.id, onClick: () => void run(s.id, () => props.onVerify(s)) },
              () => h(Check, { "aria-hidden": "true" }),
            ),
            h(
              NqButton,
              { size: "icon-sm", variant: "ghost", "aria-label": `${t.value.reject}: ${s.customer}`, disabled: busy.value === s.id, onClick: () => startReject(s) },
              () => h(X, { "aria-hidden": "true" }),
            ),
          ])
        : null,
  },
]);

const table = useDataTable({
  data: () => props.submissions as PaymentSubmission[],
  columns: () => columns.value,
  getRowId: (s) => s.id,
  pageSize: 10,
  defaultSort: { id: "sent", direction: "asc" },
});

const statusOptions = computed(() => (["submitted", "verifying", "verified", "rejected"] as const).map((s) => ({ value: s, label: t.value.statuses[s] })));
const rowLabel = (s: PaymentSubmission) => `${s.customer} ${s.reference}`;
const rowActions = (s: PaymentSubmission) => [
  ...(s.receiptUrl ? [{ id: "receipt", label: t.value.viewReceipt, icon: Eye, onSelect: () => window.open(s.receiptUrl, "_blank", "noopener,noreferrer") }] : []),
  ...(open(s)
    ? [
        { id: "verify", label: t.value.verify, icon: Check, group: "verdict", onSelect: () => void run(s.id, () => props.onVerify(s)) },
        { id: "reject", label: t.value.reject, icon: X, danger: true, group: "verdict", onSelect: () => startReject(s) },
      ]
    : []),
];
const pending = computed(() => props.submissions.filter(open).length);
</script>

<template>
  <section data-slot="payment-verification-queue" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3', props.class)">
    <h2 :id="titleId" class="text-h3 text-foreground">{{ t.queue }}</h2>
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="t.search" />
      <NqDataTableFacetFilter :table="table" column="status" :title="t.statusCol" :options="statusOptions" />
    </NqDataTableToolbar>
    <p v-if="error" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
      <CircleX aria-hidden="true" class="size-4" />
      {{ error }}
    </p>
    <NqDataTable :table="table" :label="t.queueLabel" :row-label="rowLabel" :loading="props.loading" :row-actions="rowActions">
      <template #empty><NqEmptyState :icon="ReceiptText" :title="t.emptyQueue" :description="t.emptyQueueDescription" class="border-0" /></template>
    </NqDataTable>
    <NqDialog :open="rejecting !== null" @update:open="(next: boolean) => !next && closeReject()">
      <NqDialogContent>
        <form class="grid gap-4" @submit.prevent="confirmReject">
          <NqDialogHeader>
            <NqDialogTitle>{{ t.rejectTitle }}</NqDialogTitle>
            <NqDialogDescription>{{ t.rejectDescription(rejecting?.customer ?? "") }}</NqDialogDescription>
          </NqDialogHeader>
          <a v-if="rejecting?.receiptUrl" :href="rejecting.receiptUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-body-sm text-primary underline-offset-4 hover:underline">
            <ExternalLink aria-hidden="true" class="size-3.5" />
            {{ t.viewReceipt }}
            <bdi v-if="rejecting.receiptName" dir="ltr"> ({{ rejecting.receiptName }})</bdi>
          </a>
          <NqField>
            <NqFieldLabel>{{ t.reason }}</NqFieldLabel>
            <NqTextarea v-model="reason" />
            <NqFieldDescription>{{ t.reasonHint }}</NqFieldDescription>
          </NqField>
          <NqDialogFooter>
            <NqButton type="button" variant="ghost" @click="rejecting = null">{{ t.close }}</NqButton>
            <NqButton type="submit" variant="danger" :loading="busy !== null" :disabled="!reason.trim()">{{ t.confirmReject }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>
    <span class="sr-only" aria-live="polite">{{ new Intl.NumberFormat(nq.locale.value).format(pending) }}</span>
  </section>
</template>
