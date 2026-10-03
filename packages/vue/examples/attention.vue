<script setup lang="ts">
import { MessageSquare } from "lucide-vue-next";
import { NqAttention, type AttentionItem } from "@fadymondy/nasaq/vue";

const retry = () => {};

const items: AttentionItem[] = [
  { id: "deploy", tone: "danger", title: "Riyadh Storefront deployment failed", time: "12m", href: "/deploys/91",
    action: { label: "Retry", onClick: retry } },
  { id: "approve", tone: "warning", title: "MH-721 is waiting for your approval", href: "/issues/MH-721" },
  { id: "inbox", tone: "info", icon: MessageSquare, title: "Unread conversations", count: 4, href: "/inbox" },
];
</script>

<template>
  <NqAttention :items="items" view-all-href="/inbox" />
</template>
