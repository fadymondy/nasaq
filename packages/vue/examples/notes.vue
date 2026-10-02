<script setup lang="ts">
import { NqNotes, type Note } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const now = Date.now();
const notebooks = [{ id: "work", name: "Work" }];
const notes = ref<Note[]>([
  { id: "n1", title: "Launch plan", body: "<p>Ship the beta on Thursday.</p>", notebookId: "work", tags: ["launch"], createdAt: now - 86_400_000, updatedAt: now - 3_600_000 },
  { id: "n2", title: "Ideas", body: "Try [[Launch plan]] ideas", format: "markdown", pinned: true, createdAt: now - 172_800_000, updatedAt: now - 7_200_000 },
]);

async function update(id: string, p: Partial<Note>) {
  notes.value = notes.value.map((n) => (n.id === id ? { ...n, ...p, updatedAt: Date.now() } : n));
}
async function create() {
  const id = crypto.randomUUID();
  notes.value = [{ id, title: "", body: "", createdAt: Date.now(), updatedAt: Date.now() }, ...notes.value];
  return { id };
}
async function remove(id: string) {
  notes.value = notes.value.filter((n) => n.id !== id);
}
async function duplicate(copy: Note) {
  notes.value = [copy, ...notes.value];
}
</script>

<template>
  <div class="h-[32rem]">
    <NqNotes :notes="notes" :notebooks="notebooks" :on-update="update" :on-create="create" :on-delete="remove" :on-duplicate="duplicate" :share-url="(n) => `https://app.example.com/n/${n.id}`" />
  </div>
</template>
