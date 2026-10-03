<script setup lang="ts">
import { NqApprovalQueue, type ApprovalItem } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const items = ref<ApprovalItem[]>([
  { id: "a1", kind: "action", status: "pending", title: "Send the weekly digest", description: "An automation wants to email 1,240 customers.", requester: "Digest bot", createdAt: Date.now() - 3600_000, args: { audience: "all-customers", apiKey: "sk-live-123" }, redact: ["apiKey"] },
  { id: "a2", kind: "moderation", status: "pending", title: "Review testimonial", requester: "Layla", createdAt: Date.now() - 7200_000, quote: "Great service, fast delivery." },
]);

function decide(id: string, status: ApprovalItem["status"], reason?: string) {
  items.value = items.value.map((i) => (i.id === id ? { ...i, status, reason, decidedBy: "You", decidedAt: Date.now() } : i));
}
const approve = async (id: string) => decide(id, "approved");
const reject = async (id: string, reason: string) => decide(id, "rejected", reason);
const toTask = async (id: string) => decide(id, "converted");
</script>

<template>
  <NqApprovalQueue :items="items" :on-approve="approve" :on-reject="reject" :on-convert="toTask" />
</template>
