<script setup lang="ts">
import { NqInvoiceList, type InvoiceSummary } from "@fadymondy/nasaq/vue";

const invoices: InvoiceSummary[] = [
  { id: "1", number: "INV-2026-0042", issueDate: "2026-09-01", dueDate: "2026-09-30", amount: 281.75, status: "open" },
  { id: "2", number: "INV-2026-0037", issueDate: "2026-08-01", amount: 281.75, status: "paid" },
];
const open = (i: InvoiceSummary) => console.log(i.number);
</script>

<template>
  <NqInvoiceList :invoices="invoices" currency="USD" :on-open="open" />
</template>
