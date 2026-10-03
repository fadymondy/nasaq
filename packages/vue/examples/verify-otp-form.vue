<script setup lang="ts">
import { NqVerifyOtpForm } from "@fadymondy/nasaq/vue";

// Your API calls. Resolve { error } for a wrong code (the boxes clear and refocus).
async function verify({ code }: { code: string }) {
  const res = await fetch("/api/verify", { method: "POST", body: JSON.stringify({ code }) });
  if (!res.ok) return { error: "That code is not right." };
}
async function resend() {
  await fetch("/api/resend", { method: "POST" });
}
</script>

<template>
  <div class="w-80">
    <NqVerifyOtpForm destination="fady@example.com" :on-submit="verify" :on-resend="resend">
      <template #footer><a href="/login" class="underline underline-offset-2">Use a different email</a></template>
    </NqVerifyOtpForm>
  </div>
</template>
