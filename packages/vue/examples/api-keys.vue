<script setup lang="ts">
import { NqApiKeys, type ApiKeyRecord } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const day = 86_400_000;
const keys = ref<ApiKeyRecord[]>([
  { id: "k1", name: "Production server", prefix: "nsq_live_a1b2", last4: "wxyz", scopes: ["read", "write"], createdAt: Date.now() - 40 * day, lastUsedAt: Date.now() - 3 * 3_600_000, expiresAt: Date.now() + 200 * day },
  { id: "k2", name: "CI pipeline", prefix: "nsq_live_c3d4", last4: "q9rs", scopes: ["read"], createdAt: Date.now() - 90 * day, lastUsedAt: null, expiresAt: Date.now() + 4 * day },
]);

const scopes = [
  { id: "read", label: "Read", description: "List and fetch records" },
  { id: "write", label: "Write", description: "Create and change records" },
];

async function onCreate(input: { name: string; scopes: string[]; expiresInDays: number | null }) {
  const id = `k${keys.value.length + 1}`;
  keys.value = [
    ...keys.value,
    {
      id,
      name: input.name,
      prefix: `nsq_live_${id}`,
      last4: "0000",
      scopes: input.scopes,
      createdAt: Date.now(),
      expiresAt: input.expiresInDays == null ? null : Date.now() + input.expiresInDays * day,
    },
  ];
  return { secret: `nsq_live_${id}_s3cr3t0000` };
}

async function onRevoke(id: string) {
  keys.value = keys.value.map((k) => (k.id === id ? { ...k, revokedAt: Date.now() } : k));
}
</script>

<template>
  <NqApiKeys :keys="keys" :scopes="scopes" :on-create="onCreate" :on-revoke="onRevoke" />
</template>
