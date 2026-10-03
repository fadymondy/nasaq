<script setup lang="ts">
import { NqFeatureFlagDetail, type FeatureFlag, type FlagAuditEntry, type RuleField } from "@fadymondy/nasaq/vue";

const environments = [
  { id: "dev", label: "Development" },
  { id: "prod", label: "Production" },
];

const fields: RuleField[] = [{ id: "plan", label: "Plan", kind: "select", options: [{ value: "pro", label: "Pro" }] }];

const flag: FeatureFlag = {
  key: "new-checkout",
  name: "New checkout",
  description: "The single-page checkout.",
  environments: { dev: { enabled: true, rollout: 100 }, prod: { enabled: true, rollout: 25 } },
  variants: [
    { key: "control", weight: 50 },
    { key: "single-page", weight: 50 },
  ],
  rules: [],
  updatedAt: "2026-09-28T10:00:00Z",
  updatedBy: "Mona",
};

const audit: FlagAuditEntry[] = [
  { id: "1", action: "created", actor: "Mona", at: "2026-09-20T08:00:00Z" },
  { id: "2", action: "toggled", actor: "Omar", at: "2026-09-25T09:30:00Z", environment: "Production", to: "on" },
];

async function toggle(env: string, enabled: boolean) {
  await Promise.resolve([env, enabled]);
}
async function rollout(env: string, pct: number) {
  await Promise.resolve([env, pct]);
}
async function kill(reason: string) {
  await Promise.resolve(reason);
}
</script>

<template>
  <NqFeatureFlagDetail :flag="flag" :environments="environments" :fields="fields" :audit="audit" :on-toggle="toggle" :on-rollout-change="rollout" :on-kill="kill" />
</template>
