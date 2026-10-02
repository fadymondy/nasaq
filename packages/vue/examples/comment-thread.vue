<script setup lang="ts">
import { NqCommentThread, type ThreadComment } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const me = { id: "u1", name: "Sara Ali" };
const people = [
  { id: "u1", name: "Sara Ali", description: "Design lead" },
  { id: "u2", name: "Omar Nasser", description: "Engineer" },
];
const comments = ref<ThreadComment[]>([
  { id: "c1", author: me, body: "Ready for review, @Omar Nasser.", createdAt: Date.now() - 3_600_000, mentions: [{ id: "u2", name: "Omar Nasser" }] },
  { id: "c2", author: { id: "u2", name: "Omar Nasser" }, body: "Looks good.", createdAt: Date.now() - 1_800_000, parentId: "c1" },
]);

async function save(input: { body: string; parentId?: string }) {
  comments.value.push({ id: `c${comments.value.length + 1}`, author: me, body: input.body, createdAt: Date.now(), parentId: input.parentId ?? null });
}
async function edit(id: string, body: string) {
  const c = comments.value.find((x) => x.id === id);
  if (c) Object.assign(c, { body, editedAt: Date.now() });
}
async function remove(id: string) {
  comments.value = comments.value.filter((x) => x.id !== id && x.parentId !== id);
}
</script>

<template>
  <NqCommentThread :comments="comments" :current-user="me" :suggestions="people" :on-submit="save" :on-edit="edit" :on-delete="remove" />
</template>
