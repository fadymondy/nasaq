<script setup lang="ts">
import { NqConnectedAccounts, type ConnectedProvider } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 600));

const providers = ref<ConnectedProvider[]>([
  { id: "google", connected: true, account: "fady@example.com" },
  { id: "github", connected: true, account: "fadymondy" },
  { id: "apple", connected: false },
  { id: "microsoft", connected: false },
]);

const api = {
  async connect(id: string) {
    await wait();
    providers.value = providers.value.map((p) => (p.id === id ? { ...p, connected: true, account: `${id}@example.com` } : p));
  },
  async disconnect(id: string) {
    await wait();
    providers.value = providers.value.map((p) => (p.id === id ? { ...p, connected: false, account: undefined } : p));
  },
};
</script>

<template>
  <NqConnectedAccounts :providers="providers" :other-sign-in-methods="1" :on-connect="api.connect" :on-disconnect="api.disconnect" />
</template>
