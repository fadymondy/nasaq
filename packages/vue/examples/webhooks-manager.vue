<script setup lang="ts">
import { NqWebhooksManager, type EndpointInput, type InboundSource, type WebhookDelivery, type WebhookEndpoint, type WebhookEvent } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const events: WebhookEvent[] = [
  { id: "order.created", label: "Order created", group: "Orders" },
  { id: "order.paid", label: "Order paid", group: "Orders" },
  { id: "order.refunded", label: "Order refunded", group: "Orders" },
  { id: "customer.created", label: "Customer created", group: "Customers" },
  { id: "customer.deleted", label: "Customer deleted", group: "Customers" },
];

const now = Date.now();
const endpoints = ref<WebhookEndpoint[]>([
  { id: "e1", name: "Order updates", url: "https://hooks.example.com/orders", channel: "Custom HTTP", events: ["order.created", "order.paid", "order.refunded"], enabled: true, secretLast4: "a1b2", lastDeliveryAt: now - 3600_000, lastDeliveryStatus: "success" },
  { id: "e2", name: "Team chat", url: "https://chat.example.com/hooks/T0001", channel: "Slack", events: events.map((e) => e.id), enabled: true, secretLast4: "c3d4", lastDeliveryAt: now - 86_400_000, lastDeliveryStatus: "failed" },
  { id: "e3", name: "Billing sync", url: "https://billing.example.com/webhook", events: ["order.paid"], enabled: false, secretLast4: "e5f6" },
]);
const deliveries = ref<WebhookDelivery[]>([
  { id: "d1", endpointId: "e1", event: "order.created", status: "success", code: 200, durationMs: 142, at: now - 3600_000, attempt: 1, request: '{"id":"ord_1","total":4200}', response: '{"ok":true}' },
  { id: "d2", endpointId: "e2", event: "order.paid", status: "failed", code: 500, durationMs: 1204, at: now - 86_400_000, attempt: 3, request: '{"id":"ord_2"}', response: "Internal Server Error", error: "The receiver answered with 500." },
  { id: "d3", endpointId: "e1", event: "customer.created", status: "pending", at: now - 60_000, attempt: 1 },
]);
const sources = ref<InboundSource[]>([
  { id: "s1", name: "Payments provider", target: "https://api.pay.example.com/events", intervalSeconds: 300, lastStatus: "ok", lastAt: now - 120_000 },
  { id: "s2", name: "Shipping provider", target: "https://api.ship.example.com/events", intervalSeconds: 900, lastStatus: "error", lastAt: now - 600_000, lastError: "HTTP 503" },
]);

async function onSaveEndpoint(input: EndpointInput) {
  if (input.id) {
    endpoints.value = endpoints.value.map((e) => (e.id === input.id ? { ...e, name: input.name, url: input.url, channel: input.channel || undefined, events: input.events } : e));
    return;
  }
  endpoints.value = [...endpoints.value, { id: `e${Date.now()}`, name: input.name, url: input.url, channel: input.channel || undefined, events: input.events, enabled: true, secretLast4: "9z8y" }];
  return { secret: "whsec_example_9f8e7d6c5b4a39281706" };
}
async function onDeleteEndpoint(id: string) {
  endpoints.value = endpoints.value.filter((e) => e.id !== id);
}
async function onToggleEndpoint(id: string, enabled: boolean) {
  endpoints.value = endpoints.value.map((e) => (e.id === id ? { ...e, enabled } : e));
}
async function onRotateSecret() {
  return { secret: "whsec_rotated_0a1b2c3d4e5f60718293" };
}
async function onTest() {
  return { ok: true, code: 200, durationMs: 120 };
}
async function onReplay() {}
async function onSetInterval(id: string, seconds: number) {
  sources.value = sources.value.map((s) => (s.id === id ? { ...s, intervalSeconds: seconds } : s));
}
async function onPollNow() {}
</script>

<template>
  <NqWebhooksManager
    :events="events"
    :endpoints="endpoints"
    :deliveries="deliveries"
    :sources="sources"
    :on-save-endpoint="onSaveEndpoint"
    :on-delete-endpoint="onDeleteEndpoint"
    :on-toggle-endpoint="onToggleEndpoint"
    :on-rotate-secret="onRotateSecret"
    :on-test="onTest"
    :on-replay="onReplay"
    :on-set-interval="onSetInterval"
    :on-poll-now="onPollNow"
  />
</template>
