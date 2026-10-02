<script setup lang="ts">
import { NqDesktopLoginScreen } from "@fadymondy/nasaq/vue";

// Your API call. Resolve { error } for a wrong password.
async function signIn({ email, password }: { email: string; password: string }) {
  const res = await fetch("/api/sign-in", { method: "POST", body: JSON.stringify({ email, password }) });
  if (!res.ok) return { error: "Incorrect email or password." };
}
</script>

<template>
  <NqDesktopLoginScreen title="ToGO OS" :on-submit="signIn" />
</template>
