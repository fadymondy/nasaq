<script setup lang="ts">
import { NqDomainChips, NqDomainsManager, type DomainRecord } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const day = 86_400_000;
const domains = ref<DomainRecord[]>([
  { id: "d1", host: "shop.example.com", check: "verified", primary: true, addedAt: Date.now() - 20 * day },
  { id: "d2", host: "www.example.com", check: "pending", addedAt: Date.now() - 2 * day },
  { id: "d3", host: "old.example.org", check: "failed", error: "CNAME points at 198.51.100.7", addedAt: Date.now() - 5 * day },
]);

async function onAdd(host: string) {
  domains.value = [...domains.value, { id: `d${domains.value.length + 1}`, host, check: "pending", addedAt: Date.now() }];
}
async function onRemove(id: string) {
  domains.value = domains.value.filter((d) => d.id !== id);
}
async function onRecheck(id: string) {
  domains.value = domains.value.map((d) => (d.id === id ? { ...d, check: "verified", error: undefined } : d));
}
async function onMakePrimary(id: string) {
  domains.value = domains.value.map((d) => ({ ...d, primary: d.id === id }));
}
</script>

<template>
  <div class="grid gap-6">
    <NqDomainsManager
      :domains="domains"
      cname-target="edge.example.com"
      :on-add="onAdd"
      :on-remove="onRemove"
      :on-recheck="onRecheck"
      :on-make-primary="onMakePrimary"
    />
    <NqDomainChips :domains="domains" :max="2" />
  </div>
</template>
