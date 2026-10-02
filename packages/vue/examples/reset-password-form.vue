<script setup lang="ts">
import { NqResetPasswordForm, type ResetPasswordValues } from "@fadymondy/nasaq/vue";

const token = new URLSearchParams(location.search).get("token") ?? "";

// Your API call. Resolve nothing for success, or { expired: true } when the link was used or is too old.
async function reset({ password }: ResetPasswordValues) {
  const res = await fetch("/api/reset", { method: "POST", body: JSON.stringify({ token, password }) });
  if (res.status === 410) return { expired: true as const };
}
</script>

<template>
  <div class="w-80">
    <NqResetPasswordForm rules sign-in="/login" request-link="/forgot-password" :on-submit="reset" />
  </div>
</template>
