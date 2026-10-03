<script setup lang="ts">
import { NqAuthLayout, NqSignInFlow } from "@fadymondy/nasaq/vue";

// Your API call. Resolve { error } for wrong credentials.
async function signIn({ email, password, remember }: { email: string; password: string; remember: boolean }) {
  const res = await fetch("/api/sign-in", { method: "POST", body: JSON.stringify({ email, password, remember }) });
  if (!res.ok) return { error: "Wrong email or password." };
}
</script>

<template>
  <NqAuthLayout title="Sign in">
    <NqSignInFlow :on-password="signIn">
      <template #forgotPassword><a href="/forgot-password">Forgot password?</a></template>
    </NqSignInFlow>
  </NqAuthLayout>
</template>
