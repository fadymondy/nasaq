<script setup lang="ts">
import { NqOAuthConsent } from "@fadymondy/nasaq/vue";

// Your API calls. Resolve { error } to show a failure.
async function allow() {
  await fetch("/api/oauth/allow", { method: "POST" });
}
async function deny() {
  await fetch("/api/oauth/deny", { method: "POST" });
}
</script>

<template>
  <NqOAuthConsent
    :heading-level="1"
    :app="{ name: 'Zapline', publisher: 'by Zapline Inc.' }"
    :account="{ name: 'Fady Mondy', email: 'fady@example.com' }"
    :scopes="[{ id: 'profile', label: 'Read your profile' }, { id: 'write', label: 'Edit tasks', sensitive: true }]"
    redirect-host="app.zapline.io"
    :on-allow="allow"
    :on-deny="deny"
  />
</template>
