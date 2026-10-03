<script setup lang="ts">
import { NqUserActionsMenu } from "@fadymondy/nasaq/vue";

const user = { name: "Mona Saleh", email: "mona@example.com", roles: ["editor"], permissions: ["users:read"] };

async function onEdit(values: { email: string; roles: string[]; permissions: string[] }) {
  console.log("edit", values);
}
async function onImpersonate() {}
async function onSetPassword(password: string) {
  console.log("set password", password.length);
}
async function onSendResetLink() {
  return { link: "https://example.com/reset/abc123" };
}
async function onSendMagicLink() {
  return { emailed: true };
}
async function onDelete() {}
</script>

<template>
  <NqUserActionsMenu
    :user="user"
    :on-edit="onEdit"
    :on-impersonate="onImpersonate"
    :on-set-password="onSetPassword"
    :on-send-reset-link="onSendResetLink"
    :on-send-magic-link="onSendMagicLink"
    :on-delete="onDelete"
  />
</template>
