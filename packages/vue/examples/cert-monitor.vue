<script setup lang="ts">
import { NqCertificateMonitor, type CertificateRecord } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const day = 86_400_000;
const certificates = ref<CertificateRecord[]>([
  { id: "c1", host: "app.example.com", issuer: "Let's Encrypt", validTo: Date.now() + 62 * day, autoRenew: true },
  { id: "c2", host: "api.example.com", issuer: "DigiCert", validTo: Date.now() + 5 * day },
  { id: "c3", host: "*.example.org", issuer: "Let's Encrypt", validTo: Date.now() + 21 * day, autoRenew: true },
  { id: "c4", host: "legacy.example.com", issuer: "Sectigo", validTo: Date.now() - 2 * day },
]);

async function onAdd(host: string) {
  certificates.value = [...certificates.value, { id: `c${certificates.value.length + 1}`, host, issuer: "Let's Encrypt", validTo: Date.now() + 90 * day, autoRenew: true }];
}
async function onRecheck() {}
async function onRenew(id: string) {
  certificates.value = certificates.value.map((c) => (c.id === id ? { ...c, validTo: Date.now() + 90 * day } : c));
}
async function onRemove(id: string) {
  certificates.value = certificates.value.filter((c) => c.id !== id);
}
</script>

<template>
  <NqCertificateMonitor :certificates="certificates" :on-add="onAdd" :on-recheck="onRecheck" :on-renew="onRenew" :on-remove="onRemove" />
</template>
