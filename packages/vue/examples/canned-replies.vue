<script setup lang="ts">
import { NqCannedRepliesManager, type CannedReply } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const replies = ref<CannedReply[]>([
  { id: "1", shortcut: "refund", title: "Refund policy", body: "Hi {{name}}, refunds are issued within 5 working days. {{agent}} from {{company}}", uses: 38, updatedAt: "2026-09-25T09:00:00Z" },
  { id: "2", shortcut: "thanks", title: "Thank you", body: "Thanks for reaching out, {{name}}. Anything else I can help with?", uses: 112, updatedAt: "2026-09-20T09:00:00Z" },
]);

async function onSave(reply: CannedReply) {
  const exists = replies.value.some((r) => r.id === reply.id);
  replies.value = exists ? replies.value.map((r) => (r.id === reply.id ? reply : r)) : [...replies.value, { ...reply, id: String(replies.value.length + 1) }];
}
async function onDelete(reply: CannedReply) {
  replies.value = replies.value.filter((r) => r.id !== reply.id);
}
</script>

<template>
  <NqCannedRepliesManager :replies="replies" :on-save="onSave" :on-delete="onDelete" />
</template>
