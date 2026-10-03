<script setup lang="ts">
import { NqFeatureFlagList, type FeatureFlag } from "@fadymondy/nasaq/vue";

const environments = [
  { id: "dev", label: "Development" },
  { id: "prod", label: "Production" },
];

const flags: FeatureFlag[] = [
  { key: "new-checkout", name: "New checkout", environments: { dev: { enabled: true, rollout: 100 }, prod: { enabled: true, rollout: 25 } }, variants: [], rules: [], updatedAt: "2026-09-28T10:00:00Z", updatedBy: "Mona" },
  { key: "dark-mode", name: "Dark mode", environments: { dev: { enabled: true, rollout: 100 }, prod: { enabled: false, rollout: 0 } }, variants: [], rules: [], updatedAt: "2026-09-20T10:00:00Z", updatedBy: "Omar" },
];

async function toggle(key: string, env: string, enabled: boolean) {
  await Promise.resolve([key, env, enabled]);
}
</script>

<template>
  <NqFeatureFlagList :flags="flags" :environments="environments" :on-toggle="toggle" :on-open="() => {}" />
</template>
