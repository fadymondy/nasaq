<script setup lang="ts">
import { NqInvoiceView, type InvoiceData } from "@fadymondy/nasaq/vue";

const invoice: InvoiceData = {
  number: "INV-2026-0042",
  status: "open",
  issueDate: "2026-09-01",
  dueDate: "2026-09-30",
  currency: "USD",
  taxRate: 0.15,
  from: { name: "Nasaq Ltd", address: ["1 King Fahd Rd", "Riyadh"], taxId: "300000000000003" },
  to: { name: "Acme Co", email: "billing@acme.test" },
  lines: [{ id: "1", description: "Team plan", details: "Sep 2026", quantity: 5, unitPrice: 49 }],
};
</script>

<template>
  <NqInvoiceView :invoice="invoice" />
</template>
