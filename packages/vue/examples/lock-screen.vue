<script setup lang="ts">
import { NqLockScreen } from "@fadymondy/nasaq/vue";

// Your API calls. Resolve { error } for a wrong secret.
async function unlock({ method, secret }: { method: string; secret: string }) {
  const res = await fetch("/api/unlock", { method: "POST", body: JSON.stringify({ method, secret }) });
  if (!res.ok) return { error: "That is not right. Try again." };
}
function signOut() {
  void fetch("/api/sign-out", { method: "POST" });
}
</script>

<template>
  <NqLockScreen :user="{ name: 'Nour Adel', email: 'nour@example.com' }" :methods="['pin', 'password']" :on-sign-out="signOut" :on-unlock="unlock" />
</template>
