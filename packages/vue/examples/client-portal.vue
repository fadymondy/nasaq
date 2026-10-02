<script setup lang="ts">
import { NqClientPortal } from "@fadymondy/nasaq/vue";

const tasks = [
  { id: "t1", title: "Booking calendar", status: "done" as const, assignee: "Huda Salem" },
  { id: "t2", title: "Payment page", status: "doing" as const, assignee: "Omar Nasser" },
  { id: "t3", title: "Reminder emails", status: "review" as const },
  { id: "t4", title: "Admin reports", status: "todo" as const },
];
const requests = [
  { id: "r1", title: "Add an Arabic invoice template", status: "pending" as const, createdAt: "2026-09-20T09:00:00Z", by: "Mona Ali" },
  { id: "r2", title: "Change the logo colour", status: "done" as const, createdAt: "2026-09-02T09:00:00Z", reply: "Done in the last release." },
];
const weeks = [
  { week: "2026-09-07", hours: 22 },
  { week: "2026-09-14", hours: 31.5 },
  { week: "2026-09-21", hours: 18 },
];
const invoices = [
  { id: "i1", number: "INV-0041", status: "paid" as const, issueDate: "2026-08-30", amount: 4800 },
  { id: "i2", number: "INV-0042", status: "open" as const, issueDate: "2026-09-25", dueDate: "2026-10-10", amount: 3200 },
  { id: "i3", number: "INV-0043", status: "draft" as const, issueDate: "2026-09-28", amount: 1000 },
];
const activity = [
  { id: "a1", actor: { name: "Huda Salem" }, title: "Booking calendar finished", at: "2026-09-26T10:00:00Z" },
  { id: "a2", title: "Invoice INV-0042 sent", at: "2026-09-25T08:00:00Z" },
];
const createRequest = async (r: { title: string; description: string }) => {
  console.log("request", r);
};
</script>

<template>
  <NqClientPortal
    :project="{ name: 'New booking platform', client: 'Tamkeen Co.', summary: 'Online booking for the Riyadh clinics.', due: '2026-12-01' }"
    :tasks="tasks"
    :requests="requests"
    :weeks="weeks"
    :budget-hours="240"
    :invoices="invoices"
    currency="USD"
    :activity="activity"
    :open-issues="4"
    :on-request="createRequest"
  />
</template>
