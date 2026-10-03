<script setup lang="ts">
import { NqFunnelBuilder, type FunnelSource } from "@fadymondy/nasaq/vue";

const sources: FunnelSource[] = [
  { id: "home", kind: "page", label: "Home page", detail: "/" },
  { id: "signup", kind: "event", label: "Signed up", detail: "user_signed_up" },
  { id: "order", kind: "event", label: "Placed an order", detail: "order_placed" },
];

async function save(_funnel: unknown) {
  await Promise.resolve();
}
</script>

<template>
  <NqFunnelBuilder :sources="sources" :on-save="save" />
</template>
