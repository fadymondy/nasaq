<script setup lang="ts">
import { NqClinicQueue, type ClinicQueueAction, type QueueEntry } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const t = Date.now();
const base = { checkedInAt: t - 1_800_000 };
const queue = ref<QueueEntry[]>([
  { ...base, id: "q1", ticket: "A-014", number: 14, name: "Layla Hassan", status: "serving", room: "2", queuedAt: t - 1_500_000, calledAt: t - 600_000 },
  { ...base, id: "q2", ticket: "A-015", number: 15, name: "Omar Nasser", status: "called", room: "2", priority: "appointment", queuedAt: t - 1_200_000, calledAt: t - 420_000 },
  { ...base, id: "q3", ticket: "A-016", number: 16, name: "Sara Khalil", status: "waiting", priority: "urgent", queuedAt: t - 600_000 },
  { ...base, id: "q4", ticket: "A-017", number: 17, name: "Hadi Mansour", status: "waiting", priority: "appointment", queuedAt: t - 500_000 },
  { ...base, id: "q5", ticket: "A-018", number: 18, name: "Nour Aziz", status: "waiting", queuedAt: t - 300_000 },
]);

const act = async (action: ClinicQueueAction, id?: string) => {
  const target = id ? queue.value.find((e) => e.id === id) : queue.value.find((e) => e.status === "waiting");
  if (!target) return;
  const status = { "call-next": "called", call: "called", recall: "called", skip: "skipped", start: "serving", finish: "done", "no-show": "no_show" }[action] as QueueEntry["status"];
  queue.value = queue.value.map((e) => (e.id === target.id ? { ...e, status, calledAt: status === "called" ? Date.now() : e.calledAt } : e));
};
</script>

<template>
  <NqClinicQueue :entries="queue" :on-action="act" />
</template>
