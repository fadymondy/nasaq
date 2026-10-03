<script setup lang="ts">
import { NqInviteAccept } from "@fadymondy/nasaq/vue";

const token = new URLSearchParams(location.search).get("token") ?? "";

// Your API calls. Resolve { error } to show a failure.
async function accept() {
  const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
  if (!res.ok) return { error: "Could not accept the invitation." };
}
async function decline() {
  await fetch(`/api/invites/${token}/decline`, { method: "POST" });
}
</script>

<template>
  <NqInviteAccept
    state="valid"
    :workspace="{ name: 'Sahab Studio', meta: '12 members' }"
    :invited-by="{ name: 'Sara Alharbi' }"
    role="Admin"
    invite-email="omar@example.com"
    :account="{ name: 'Omar Khalid', email: 'omar@example.com' }"
    :on-accept="accept"
    :on-decline="decline"
  />
</template>
