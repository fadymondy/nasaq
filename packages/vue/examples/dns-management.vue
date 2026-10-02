<script setup lang="ts">
import { NqDnsManagement, type DnsRecord, type DnsRecordInput } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const records = ref<DnsRecord[]>([
  { id: "r1", type: "A", name: "@", content: "203.0.113.10", ttl: 1, proxied: true },
  { id: "r2", type: "CNAME", name: "www", content: "example.com", ttl: 300, proxied: true },
  { id: "r3", type: "MX", name: "@", content: "mail.example.com", ttl: 3600, priority: 10 },
  { id: "r4", type: "TXT", name: "@", content: "v=spf1 include:_spf.example.com ~all", ttl: 3600 },
]);

async function onSave(input: DnsRecordInput) {
  if (input.id) {
    records.value = records.value.map((r) => (r.id === input.id ? { ...r, ...input, id: input.id } : r));
  } else {
    records.value = [...records.value, { ...input, id: `r${records.value.length + 1}` }];
  }
}

async function onDelete(id: string) {
  records.value = records.value.filter((r) => r.id !== id);
}

async function onToggleProxy(id: string, proxied: boolean) {
  records.value = records.value.map((r) => (r.id === id ? { ...r, proxied } : r));
}
</script>

<template>
  <NqDnsManagement zone="example.com" :records="records" :on-save="onSave" :on-delete="onDelete" :on-toggle-proxy="onToggleProxy" />
</template>
