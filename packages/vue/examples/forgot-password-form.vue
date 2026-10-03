<script setup lang="ts">
import { NqForgotPasswordForm, type ForgotPasswordValues } from "@fadymondy/nasaq/vue";

// Your API call. Resolve nothing and the form shows "Check your inbox" with a resend button on a cooldown.
async function sendReset({ email }: ForgotPasswordValues) {
  await new Promise((r) => setTimeout(r, 400));
  void email;
}
</script>

<template>
  <div class="w-80">
    <NqForgotPasswordForm :on-submit="sendReset" />
  </div>
</template>
