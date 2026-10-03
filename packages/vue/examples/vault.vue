<script setup lang="ts">
import { NqVault, type VaultSecret } from "@fadymondy/nasaq/vue";

const day = 86_400_000;
const secrets: VaultSecret[] = [
  { id: "s1", name: "STRIPE_SECRET_KEY", group: "Payments", kind: "api-key", hint: "…4242", updatedAt: Date.now() - 30 * day, expiresAt: Date.now() + 200 * day, lastAccessedAt: Date.now() - 2 * 3_600_000 },
  { id: "s2", name: "DATABASE_URL", group: "Backend", kind: "password", description: "Primary Postgres", hint: "…x9f2", updatedAt: Date.now() - 90 * day, expiresAt: Date.now() + 6 * day },
  { id: "s3", name: "DEPLOY_SSH_KEY", group: "Backend", kind: "ssh-key", updatedAt: Date.now() - 10 * day },
];

const values: Record<string, string> = { s1: "sk_live_demo4242", s2: "postgres://app:secret@db.internal/app", s3: "ssh-ed25519 AAAA-demo" };
const reveal = async (id: string) => ({ value: values[id] ?? "" });
</script>

<template>
  <NqVault :secrets="secrets" :on-reveal="reveal" />
</template>
