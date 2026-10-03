<script setup lang="ts">
import { NqTwoFactorChallenge, type TwoFactorValues } from "@fadymondy/nasaq/vue";

// Your API call. Resolve { error } for a wrong code (the input clears and refocuses).
async function verify({ code, method, trustDevice }: TwoFactorValues) {
  const res = await fetch("/api/second-factor", { method: "POST", body: JSON.stringify({ code, method, trustDevice }) });
  if (!res.ok) return { error: "That code is not right, or it expired." };
}
</script>

<template>
  <div class="w-80">
    <NqTwoFactorChallenge :on-submit="verify" :on-passkey="() => {}">
      <template #footer><a href="/login" class="underline underline-offset-2">Back to sign in</a></template>
    </NqTwoFactorChallenge>
  </div>
</template>
