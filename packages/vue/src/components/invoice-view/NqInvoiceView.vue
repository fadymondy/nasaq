<script setup lang="ts">
import { Download, Printer } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqDateTime, NqNum } from "../numeric";
import NqInvoiceStatusBadge from "./NqInvoiceStatusBadge.vue";
import { computeInvoice, PRINT_CSS, useInvoiceStrings, type InvoiceData, type InvoiceLabels } from "./invoice";

// An invoice as a document: parties, dates, line items, totals, payments and notes, with a status chip and an
// action bar (download, print, pay). Printing produces only the sheet, black on white, with rows kept whole.
interface Props {
  invoice: InvoiceData;
  /** Builds and saves the PDF. Yours: this component only shows the busy state and any error. Omit to hide the button. */
  onDownload?: () => Promise<void>;
  /** Replaces `window.print()`. */
  onPrint?: () => void;
  /** Shows "Pay now" while the invoice is open or overdue. */
  onPay?: () => void;
  /** Hide the whole action bar. */
  hideActions?: boolean;
  labels?: InvoiceLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onDownload: undefined, onPrint: undefined, onPay: undefined, hideActions: false });
const { t } = useInvoiceStrings(() => props.labels);
const currency = useCurrency(() => props.invoice.currency);
const titleId = `nq-invoice-${useId()}`;
const busy = ref(false);
const error = ref<string | null>(null);
const money = computed(() => ({ style: "currency", currency: currency.value }) as const);
const totals = computed(() => computeInvoice(props.invoice));
const payable = computed(() => (props.invoice.status === "open" || props.invoice.status === "overdue") && totals.value.due > 0);
const parties = computed(() => [
  { party: props.invoice.from, label: t.value.from },
  { party: props.invoice.to, label: t.value.billTo },
]);
const sums = computed(() => {
  const x = totals.value;
  const rows: { label: string; value: number; strong: boolean; negative: boolean }[] = [{ label: t.value.subtotal, value: x.subtotal, strong: false, negative: false }];
  if (x.discount > 0) rows.push({ label: t.value.discount, value: x.discount, strong: false, negative: true });
  if (x.tax > 0) rows.push({ label: t.value.tax, value: x.tax, strong: false, negative: false });
  rows.push({ label: t.value.total, value: x.total, strong: true, negative: false });
  if (x.paid > 0) rows.push({ label: t.value.paid, value: x.paid, strong: false, negative: true });
  if (props.invoice.status !== "draft") rows.push({ label: t.value.amountDue, value: x.due, strong: true, negative: false });
  return rows;
});

async function download() {
  if (!props.onDownload || busy.value) return;
  busy.value = true;
  error.value = null;
  try {
    await props.onDownload();
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : t.value.downloadFailed;
  } finally {
    busy.value = false;
  }
}
function print() {
  if (props.onPrint) props.onPrint();
  else window.print();
}
</script>

<template>
  <section data-slot="invoice-view" :data-status="props.invoice.status" :aria-labelledby="titleId" :class="cn('flex flex-col gap-4', props.class)">
    <component :is="'style'">{{ PRINT_CSS }}</component>
    <div v-if="!props.hideActions" role="toolbar" :aria-label="t.actions" data-slot="invoice-actions" class="flex flex-wrap items-center justify-end gap-2 print:hidden">
      <p v-if="error" role="alert" class="me-auto text-body-sm text-nq-danger-text">{{ error }}</p>
      <slot name="actions" />
      <NqButton v-if="props.onDownload" :loading="busy" @click="download()">
        <Download aria-hidden="true" />
        {{ t.download }}
      </NqButton>
      <NqButton @click="print()">
        <Printer aria-hidden="true" />
        {{ t.print }}
      </NqButton>
      <NqButton v-if="props.onPay && payable" variant="primary" @click="props.onPay()">{{ t.pay }}</NqButton>
    </div>

    <article data-slot="invoice-sheet" class="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-card border border-border bg-card p-6 text-card-foreground @container sm:p-10">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-2">
          <div v-if="$slots.logo || props.invoice.from.logo" class="h-9 [&_img]:h-full [&_svg]:h-full">
            <slot name="logo"><img :src="props.invoice.from.logo" :alt="props.invoice.from.name" /></slot>
          </div>
          <h1 :id="titleId" class="text-h1 text-foreground">{{ t.invoice }}</h1>
          <p class="text-body-sm text-muted-foreground">
            {{ t.number }} <bdi dir="ltr" class="font-mono text-foreground">{{ props.invoice.number }}</bdi>
          </p>
        </div>
        <NqInvoiceStatusBadge :status="props.invoice.status" :labels="props.labels" class="h-6 px-2" />
      </header>

      <dl class="grid grid-cols-2 gap-4 text-body-sm sm:grid-cols-3">
        <div>
          <dt class="text-caption text-muted-foreground">{{ t.issued }}</dt>
          <dd class="text-foreground"><NqDateTime :value="props.invoice.issueDate" /></dd>
        </div>
        <div v-if="props.invoice.dueDate">
          <dt class="text-caption text-muted-foreground">{{ t.due }}</dt>
          <dd :class="cn('text-foreground', props.invoice.status === 'overdue' && 'text-nq-danger-text')"><NqDateTime :value="props.invoice.dueDate" /></dd>
        </div>
        <div>
          <dt class="text-caption text-muted-foreground">{{ t.currency }}</dt>
          <dd class="text-foreground"><bdi dir="ltr">{{ currency }}</bdi></dd>
        </div>
      </dl>

      <div class="grid gap-6 sm:grid-cols-2" data-keep-together>
        <div v-for="(p, i) in parties" :key="i" class="flex min-w-0 flex-col gap-1 text-body-sm">
          <p class="text-caption font-medium uppercase tracking-wide text-muted-foreground">{{ p.label }}</p>
          <p class="text-label text-foreground">{{ p.party.name }}</p>
          <p v-for="line in p.party.address" :key="line" class="text-muted-foreground">{{ line }}</p>
          <bdi v-if="p.party.email" dir="ltr" class="text-start text-muted-foreground">{{ p.party.email }}</bdi>
          <bdi v-if="p.party.phone" dir="ltr" class="text-start text-muted-foreground">{{ p.party.phone }}</bdi>
          <p v-if="p.party.taxId" class="text-muted-foreground">{{ t.taxId }}: <bdi dir="ltr">{{ p.party.taxId }}</bdi></p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-body-sm">
          <thead>
            <tr class="border-b border-border text-caption text-muted-foreground">
              <th scope="col" class="pb-2 pe-3 text-start font-medium">{{ t.description }}</th>
              <th scope="col" class="px-3 pb-2 text-end font-medium">{{ t.quantity }}</th>
              <th scope="col" class="px-3 pb-2 text-end font-medium">{{ t.unitPrice }}</th>
              <th scope="col" class="ps-3 pb-2 text-end font-medium">{{ t.amount }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in props.invoice.lines" :key="line.id" class="border-b border-border align-top">
              <td class="py-3 pe-3">
                <p class="text-foreground">{{ line.description }}</p>
                <p v-if="line.details" class="text-caption text-muted-foreground">{{ line.details }}</p>
              </td>
              <td class="px-3 py-3 text-end text-foreground"><NqNum :value="line.quantity" /></td>
              <td class="px-3 py-3 text-end text-foreground"><NqNum :value="line.unitPrice" :format="money" /></td>
              <td class="ps-3 py-3 text-end text-foreground"><NqNum :value="line.quantity * line.unitPrice" :format="money" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <dl data-keep-together class="ms-auto flex w-full max-w-72 flex-col gap-2">
        <div v-for="row in sums" :key="row.label" :class="cn('flex justify-between gap-6', row.strong ? 'border-t border-border pt-2 text-label text-foreground' : 'text-body-sm text-muted-foreground')">
          <dt>{{ row.label }}</dt>
          <dd :class="cn(!row.strong && 'text-foreground')"><NqNum :value="row.negative ? -row.value : row.value" :format="money" /></dd>
        </div>
      </dl>

      <section v-if="props.invoice.payments?.length" data-keep-together :aria-label="t.payments" class="flex flex-col gap-2">
        <h2 class="text-label text-foreground">{{ t.payments }}</h2>
        <table class="w-full border-collapse text-body-sm">
          <thead class="sr-only">
            <tr>
              <th scope="col">{{ t.date }}</th>
              <th scope="col">{{ t.method }}</th>
              <th scope="col">{{ t.amount }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in props.invoice.payments" :key="p.id" class="border-b border-border">
              <td class="py-2 pe-3 text-muted-foreground"><NqDateTime :value="p.date" /></td>
              <td class="px-3 py-2 text-foreground">{{ p.method }}</td>
              <td class="ps-3 py-2 text-end text-foreground"><NqNum :value="p.amount" :format="money" /></td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer v-if="props.invoice.notes || props.invoice.terms" data-keep-together class="grid gap-4 border-t border-border pt-6 text-body-sm sm:grid-cols-2">
        <div v-if="props.invoice.notes">
          <h2 class="text-label text-foreground">{{ t.notes }}</h2>
          <p class="text-muted-foreground">{{ props.invoice.notes }}</p>
        </div>
        <div v-if="props.invoice.terms">
          <h2 class="text-label text-foreground">{{ t.terms }}</h2>
          <p class="text-muted-foreground">{{ props.invoice.terms }}</p>
        </div>
      </footer>
    </article>
  </section>
</template>
