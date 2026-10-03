<script setup lang="ts">
import { ref } from "vue";
import { NqWhatsappQrConnect } from "@fadymondy/nasaq/vue";

const status = ref<"disconnected" | "qr" | "connected">("disconnected");
const qr = ref<string | undefined>();
const expiresAt = ref<number | undefined>();
const next = () => {
  qr.value = `2@demo-${Date.now()}`;
  expiresAt.value = Date.now() + 30_000;
};
const start = async () => {
  status.value = "qr";
  next();
};
const refresh = async () => next();
const disconnect = async () => {
  status.value = "disconnected";
  qr.value = undefined;
};
</script>

<template>
  <NqWhatsappQrConnect :status="status" :qr="qr" :expires-at="expiresAt" account="+1 555 010 0100" :on-start="start" :on-refresh="refresh" :on-disconnect="disconnect" />
</template>
