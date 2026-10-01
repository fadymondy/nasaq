<script setup lang="ts">
import { ref } from "vue";
import { NqNotificationCenter, type NotificationCenterItem } from "@fadymondy/nasaq/vue";

const items = ref<NotificationCenterItem[]>([
  { id: "1", actor: { name: "Sara Alharbi" }, title: "Sara mentioned you in MH-142", time: new Date(Date.now() - 300_000), unread: true },
  { id: "2", title: "Invoice INV-031 was paid", time: "2026-09-28T09:00:00Z" },
]);
</script>

<template>
  <NqNotificationCenter
    :items="items"
    @item-click="(item) => (items = items.map((i) => (i.id === item.id ? { ...i, unread: false } : i)))"
    @mark-all-read="items = items.map((i) => ({ ...i, unread: false }))"
  />
</template>
