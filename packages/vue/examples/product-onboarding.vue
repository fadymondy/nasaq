<script setup lang="ts">
// The product onboarding steps with the Vue wizard: workspace → business → sample data → connect your AI → invite → done.
import { NqSetupWizard } from "@fadymondy/nasaq/vue";

const state = { completed: ["workspace"], skipped: [] as string[] };
const steps = [
  { id: "workspace", title: "Your workspace" },
  { id: "business", title: "Business basics" },
  { id: "sample-data", title: "Sample data", optional: true },
  { id: "connect-mcp", title: "Connect your AI", optional: true },
  { id: "invite", title: "Invite your team", optional: true },
];
const resumeAt = Math.max(0, steps.findIndex((s) => !state.completed.includes(s.id) && !state.skipped.includes(s.id)));
const record = async (_step: string) => undefined;
const finish = async () => undefined;
</script>

<template>
  <NqSetupWizard title="Set up Matjar" :steps="steps" :default-current="resumeAt" :completed="state.completed" :on-step-complete="record" :on-finish="finish">
    <template #step-workspace><input aria-label="Store name" value="3x1" /></template>
    <template #step-business><input aria-label="Currency" value="EGP" /></template>
    <template #step-sample-data><button type="button">Load sample data</button></template>
    <template #step-connect-mcp><p>Connect Claude, ChatGPT or your editor.</p></template>
    <template #step-invite><textarea aria-label="Email addresses" dir="ltr" /></template>
  </NqSetupWizard>
</template>
