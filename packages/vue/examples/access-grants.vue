<script setup lang="ts">
import { NqAccessGrants, type AccessLevel, type ConnectedApp, type GrantMatrix } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const apps = ref<ConnectedApp[]>([
  { id: "a1", name: "Notion Sync", kind: "app", publisher: "Acme Labs", orgId: "o1", scopes: ["docs:read", "users:read"], authorizedAt: "2026-08-01", lastUsedAt: "2026-09-28T10:00:00Z" },
  { id: "g1", name: "Support Agent", kind: "agent", publisher: "Nasaq", orgId: "o1", scopes: ["docs:read", "docs:write", "billing:read", "users:read", "users:write"], authorizedAt: "2026-09-01", lastUsedAt: null },
]);
const scopeLabels = { "docs:read": "Read documents", "docs:write": "Write documents", "billing:read": "Read billing", "users:read": "Read users", "users:write": "Write users" };
const organizations = [
  { id: "o1", name: "Acme" },
  { id: "o2", name: "Globex" },
];
const resources = [
  { id: "docs", label: "Documents" },
  { id: "billing", label: "Billing" },
];
const grants = ref<GrantMatrix>({ g1: { docs: "write", billing: "read" } });

async function onRevoke(app: ConnectedApp) {
  apps.value = apps.value.filter((a) => a.id !== app.id);
}
async function onChangeGrant(agent: string, resource: string, level: AccessLevel) {
  grants.value = { ...grants.value, [agent]: { ...grants.value[agent], [resource]: level } };
}
</script>

<template>
  <NqAccessGrants :apps="apps" :scope-labels="scopeLabels" :organizations="organizations" :on-revoke="onRevoke" :resources="resources" :grants="grants" :on-change-grant="onChangeGrant" :sections="['apps', 'grants']" />
</template>
