<script setup lang="ts">
import { NqStoreOrderTimeline } from "@fadymondy/nasaq/vue";

const order = {
  status: "shipped",
  payment: "paid",
  placedAt: "2026-09-20T10:00:00Z",
  events: [
    { at: "2026-09-20T10:00:00Z", kind: "placed", label: "Order placed" },
    { at: "2026-09-20T10:05:00Z", kind: "paid", label: "Payment confirmed" },
    { at: "2026-09-21T09:00:00Z", kind: "shipped", label: "Shipped" },
  ],
  tracking: { carrier: "Aramex", number: "AB123456789" },
} as const;
</script>

<template>
  <NqStoreOrderTimeline
    :status="order.status"
    :payment="order.payment"
    :placed-at="order.placedAt"
    :events="order.events"
    :tracking="order.tracking"
    tracking-template="https://track.example.com/?n={number}"
  />
</template>
