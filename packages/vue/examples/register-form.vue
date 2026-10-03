<script setup lang="ts">
import { NqRegisterForm, type RegisterValues } from "@fadymondy/nasaq/vue";

// Your API call. Return { fieldErrors: { email: "..." } } when the address is taken.
async function register(values: RegisterValues) {
  await new Promise((r) => setTimeout(r, 400));
  if (values.email === "taken@example.com") return { fieldErrors: { email: "This email is already registered." } };
}
</script>

<template>
  <div class="w-80">
    <NqRegisterForm :on-submit="register" :oauth-providers="['google', 'github']">
      <template #terms>I agree to the <a href="/terms" class="underline underline-offset-2">Terms</a> and <a href="/privacy" class="underline underline-offset-2">Privacy Policy</a></template>
    </NqRegisterForm>
  </div>
</template>
