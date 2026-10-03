<script setup lang="ts">
import { NqInbox, type ConversationPatch, type InboxAgent, type InboxConversation, type InboxDraft } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const agents: InboxAgent[] = [
  { id: "a1", name: "Sara Ali", email: "sara@example.com" },
  { id: "a2", name: "Omar Nasser", email: "omar@example.com" },
];
const list = ref<InboxConversation[]>([
  {
    id: "c1",
    channel: "chat",
    status: "open",
    unread: 2,
    contact: { id: "u1", name: "Layla Hassan", email: "layla@example.com" },
    messages: [
      { id: "m1", direction: "in", kind: "text", body: "Hi, where is my order?", at: new Date("2026-09-29T08:00:00").getTime() },
      { id: "m2", direction: "in", kind: "text", body: "It was due yesterday.", at: new Date("2026-09-29T08:02:00").getTime() },
    ],
  },
  {
    id: "c2",
    channel: "email",
    status: "open",
    subject: "Invoice for September",
    contact: { id: "u2", name: "Karim Adel", email: "karim@example.com" },
    messages: [{ id: "m3", direction: "in", kind: "text", body: "Could you resend the invoice?", at: new Date("2026-09-29T07:00:00").getTime() }],
  },
] as unknown as InboxConversation[]);

async function send(draft: InboxDraft) {
  const c = list.value.find((x) => x.id === draft.conversationId);
  c?.messages.push({ id: `m${Date.now()}`, direction: "out", kind: draft.mode === "note" ? "note" : "text", body: draft.body, at: Date.now() } as never);
}
async function update(id: string, patch: ConversationPatch) {
  list.value = list.value.map((c) => (c.id === id ? { ...c, ...patch } : c)) as InboxConversation[];
}
</script>

<template>
  <NqInbox :conversations="list" :agents="agents" current-agent-id="a1" :on-send="send" :on-update="update" />
</template>
