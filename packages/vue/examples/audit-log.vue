<script setup lang="ts">
import { diffRecords, NqAuditLog, type AuditEntry } from "@fadymondy/nasaq/vue";

const entries: AuditEntry[] = [
  {
    id: "a1",
    at: "2026-03-10T09:12:00Z",
    actor: { id: "u1", name: "Sara Alharbi", email: "sara@example.com" },
    action: "member.role_changed",
    entity: { type: "member", label: "Omar Khalid" },
    channel: "web",
    changes: diffRecords({ role: "member" }, { role: "admin" }),
  },
];

const setRetention = async (_days: number | null) => {};
</script>

<template>
  <NqAuditLog
    :entries="entries"
    :action-labels="{ 'member.role_changed': 'Role changed' }"
    :entity-labels="{ member: 'Member' }"
    :retention="{ days: 90 }"
    :on-change-retention="setRetention"
  />
</template>
