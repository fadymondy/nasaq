<script setup lang="ts">
import { NqJournalEntryEditor, NqTrialBalance, type AccountingAccount, type AccountingEntry, type JournalEntryEditorValue } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const accounts: AccountingAccount[] = [
  { id: "assets", code: "1000", name: "Assets", type: "asset" },
  { id: "cash", code: "1010", name: "Cash", type: "asset", parentId: "assets" },
  { id: "bank", code: "1020", name: "Bank", type: "asset", parentId: "assets" },
  { id: "capital", code: "3000", name: "Owner capital", type: "equity" },
  { id: "sales", code: "4000", name: "Sales", type: "revenue" },
  { id: "rent", code: "5000", name: "Rent", type: "expense" },
];
const entries = ref<AccountingEntry[]>([
  {
    id: "e1",
    number: "JE-0007",
    date: "2026-09-01",
    memo: "Opening capital",
    status: "posted",
    lines: [
      { accountId: "bank", debit: 1000000, credit: 0 },
      { accountId: "capital", debit: 0, credit: 1000000 },
    ],
  },
  {
    id: "e2",
    number: "JE-0008",
    date: "2026-09-10",
    memo: "Cash sale",
    status: "posted",
    lines: [
      { accountId: "cash", debit: 250000, credit: 0 },
      { accountId: "sales", debit: 0, credit: 250000 },
    ],
  },
]);

async function onPost(entry: JournalEntryEditorValue) {
  entries.value = [...entries.value, { id: `e${entries.value.length + 1}`, number: "JE-0009", date: entry.date, memo: entry.memo, status: "posted", lines: entry.lines }];
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqJournalEntryEditor :accounts="accounts" currency="SAR" number="JE-0009" :on-post="onPost" />
    <NqTrialBalance :accounts="accounts" :entries="entries" currency="SAR" />
  </div>
</template>
