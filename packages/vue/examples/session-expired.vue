<script setup lang="ts">
import { NqAuthLayout, NqSessionExpired } from "@fadymondy/nasaq/vue";

// Your API calls. Resolve { error } for a wrong password.
async function reauth({ password }: { password: string }) {
  const res = await fetch("/api/reauth", { method: "POST", body: JSON.stringify({ password }) });
  if (!res.ok) return { error: "Wrong password." };
}
function signOut() {
  void fetch("/api/sign-out", { method: "POST" });
}
</script>

<template>
  <NqAuthLayout title="Welcome back">
    <NqSessionExpired :user="{ name: 'Sara Nasser', email: 'sara@example.com' }" keeps-work :on-submit="reauth" :on-sign-out="signOut" />
  </NqAuthLayout>
</template>
