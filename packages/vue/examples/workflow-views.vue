<script setup lang="ts">
import { NqWorkflowViews } from "@fadymondy/nasaq/vue";

const steps = [
  { id: "ask", title: "Customer asks for a refund", owner: "Customer" },
  {
    id: "check",
    title: "Within 14 days?",
    branches: [
      { label: "Yes", steps: [{ id: "approve", title: "Approve the refund", owner: "Support" }] },
      { label: "No", steps: [{ id: "review", title: "Manager reviews", kind: "human" as const, description: "Late requests need a second look." }] },
    ],
  },
  {
    id: "pay",
    title: "Issue the refund",
    kind: "output" as const,
    children: [
      { id: "ledger", title: "Post to the ledger", owner: "Billing API", kind: "system" as const },
      { id: "email", title: "Email the customer" },
    ],
  },
];
</script>

<template>
  <NqWorkflowViews :steps="steps" storage-key="workflow:view" highlight="check" @step-click="() => {}" />
</template>
