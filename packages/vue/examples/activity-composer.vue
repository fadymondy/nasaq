<script setup lang="ts">
import { NqActivityComposer, NqActivityTimeline, type ActivityInput, type ActivityRecord } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const activities = ref<ActivityRecord[]>([
  { id: "a1", kind: "call", body: "Walked through the proposal.", at: "2026-09-28T10:00:00", durationMinutes: 20, actor: { name: "Sara Ali" } },
  { id: "a2", kind: "task", body: "Send the revised quote", at: "2026-10-02T09:00:00" },
  { id: "a3", kind: "event", body: "Stage moved to Proposal", at: "2026-09-27T08:00:00", actor: { name: "Omar Nasser" } },
]);

async function save({ kind, body, at, durationMinutes }: ActivityInput) {
  activities.value.push({ id: `a${activities.value.length + 1}`, kind, body, at, durationMinutes });
}
async function toggle(id: string, done: boolean) {
  const a = activities.value.find((x) => x.id === id);
  if (a) Object.assign(a, { done, doneAt: done ? new Date() : null });
}
async function remove(id: string) {
  activities.value = activities.value.filter((x) => x.id !== id);
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqActivityComposer :on-submit="save" />
    <NqActivityTimeline :activities="activities" :on-toggle-task="toggle" :on-delete="remove" />
  </div>
</template>
