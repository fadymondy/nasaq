<script setup lang="ts">
import { NqPasskeyList, type Passkey } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 600));

const passkeys = ref<Passkey[]>([
  { id: "1", name: "MacBook Pro", kind: "device", authenticator: "Touch ID", createdAt: "2026-03-02T09:00:00Z", lastUsedAt: "2026-09-28T08:30:00Z" },
  { id: "2", name: "iCloud Keychain", kind: "synced", authenticator: "iCloud Keychain", createdAt: "2026-05-14T12:00:00Z", lastUsedAt: null },
  { id: "3", name: "YubiKey 5C", kind: "security-key", createdAt: "2026-07-21T15:30:00Z", lastUsedAt: "2026-08-02T10:00:00Z" },
]);

const api = {
  async register() {
    await wait();
    passkeys.value = [...passkeys.value, { id: String(Date.now()), name: "New passkey", kind: "device", createdAt: new Date(), lastUsedAt: null }];
  },
  async rename(id: string, name: string) {
    await wait();
    passkeys.value = passkeys.value.map((p) => (p.id === id ? { ...p, name } : p));
  },
  async remove(id: string) {
    await wait();
    passkeys.value = passkeys.value.filter((p) => p.id !== id);
  },
};
</script>

<template>
  <NqPasskeyList :passkeys="passkeys" :on-add="api.register" :on-rename="api.rename" :on-remove="api.remove" :supported="true" />
</template>
