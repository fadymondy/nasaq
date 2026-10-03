<script setup lang="ts">
import { NqDeployView, type DeployStep } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const steps = ref<DeployStep[]>([
  { id: "install", name: "Install dependencies", command: "pnpm install --frozen-lockfile", status: "success", durationMs: 8200, logs: "Lockfile is up to date\nPackages: +412" },
  { id: "build", name: "Build", command: "pnpm build", status: "running", startedAt: Date.now() - 4000, logs: "\u001b[32m✓\u001b[0m compiling...\n" },
  { id: "ship", name: "Ship to production", command: "pnpm deploy --prod", status: "pending" },
]);

const retry = async (id: string) => {
  steps.value = steps.value.map((s) => (s.id === id ? { ...s, status: "running", startedAt: Date.now(), error: undefined } : s));
};
</script>

<template>
  <NqDeployView title="Deploy api to production" :steps="steps" :on-retry="retry">
    <template #meta>main · 4f2a91c</template>
  </NqDeployView>
</template>
