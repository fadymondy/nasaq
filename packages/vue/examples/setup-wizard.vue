<script setup lang="ts">
import { NqSetupWizard } from "@fadymondy/nasaq/vue";

const done: string[] = [];
const canFinish = false;

const steps = [
  { id: "name", title: "Name" },
  { id: "agent", title: "Agent" },
];
const saveStep = async (_id: string) => undefined;
const finish = async () => undefined;
</script>

<template>
  <NqSetupWizard
    title="Set up your workspace"
    :completed="done"
    :can-finish="canFinish"
    :gate-message="canFinish ? undefined : 'Connect an agent first.'"
    :steps="steps"
    :on-step-complete="saveStep"
    :on-finish="finish"
  >
    <template #step-name><input aria-label="Name" /></template>
    <template #step-agent><p>Run the command.</p></template>
  </NqSetupWizard>
</template>
