<script setup lang="ts">
import { NqChangePasswordForm, type ChangePasswordValues } from "@fadymondy/nasaq/vue";

// Your API call. Return { fieldErrors: { currentPassword: "..." } } for a wrong current password.
async function change(values: ChangePasswordValues) {
  await new Promise((r) => setTimeout(r, 400));
  if (values.currentPassword !== "correct-horse") {
    return { fieldErrors: { currentPassword: "That is not your current password." } };
  }
}
</script>

<template>
  <NqChangePasswordForm :on-submit="change" />
</template>
