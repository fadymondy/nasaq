<script setup lang="ts">
import { NqLoginForm, type LoginValues } from "@fadymondy/nasaq/vue";

// Your API call. Return { error } for a wrong password.
async function signIn({ email, password }: LoginValues) {
  await new Promise((r) => setTimeout(r, 400));
  if (password !== "correct-horse") return { error: "Incorrect email or password." };
}
</script>

<template>
  <div class="w-80">
    <NqLoginForm :on-submit="signIn">
      <template #forgotPassword><a href="/forgot-password" class="underline underline-offset-2">Forgot password?</a></template>
    </NqLoginForm>
  </div>
</template>
