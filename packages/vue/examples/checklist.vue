<script setup lang="ts">
import { NqChecklist, toggleItem, type ChecklistItem } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const items = ref<ChecklistItem[]>([
  { id: "1", text: "Write the brief", done: true },
  {
    id: "2",
    text: "Prepare the launch",
    done: false,
    subtasks: [
      { id: "2a", text: "Draft the announcement", done: true },
      { id: "2b", text: "Schedule the post", done: false },
    ],
  },
]);

async function toggle(id: string, done: boolean) {
  items.value = toggleItem(items.value, id, done);
}
async function add(text: string, parentId?: string) {
  const item = { id: crypto.randomUUID(), text, done: false };
  items.value = parentId ? items.value.map((i) => (i.id === parentId ? { ...i, subtasks: [...(i.subtasks ?? []), item] } : i)) : [...items.value, item];
}
async function remove(id: string) {
  items.value = items.value.filter((i) => i.id !== id).map((i) => ({ ...i, subtasks: i.subtasks?.filter((s) => s.id !== id) }));
}
</script>

<template>
  <NqChecklist :items="items" :on-toggle="toggle" :on-add="add" :on-remove="remove" />
</template>
