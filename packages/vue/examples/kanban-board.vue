<script setup lang="ts">
import { NqKanbanBoard, type KanbanCardData } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const columns = [
  { id: "todo", title: "To do" },
  { id: "done", title: "Done" },
];
const cards = ref<KanbanCardData[]>([
  { id: "a", columnId: "todo", title: "Write the brief", labels: [{ label: "Docs", hue: "blue" }], assignee: { name: "Sara Ali" } },
  { id: "b", columnId: "todo", title: "Review copy" },
]);

function move(id: string, toColumn: string, toIndex: number) {
  const card = cards.value.find((c) => c.id === id);
  if (!card) return;
  const rest = cards.value.filter((c) => c.id !== id);
  const inColumn = rest.filter((c) => c.columnId === toColumn);
  inColumn.splice(toIndex, 0, { ...card, columnId: toColumn });
  cards.value = [...rest.filter((c) => c.columnId !== toColumn), ...inColumn];
}
</script>

<template>
  <NqKanbanBoard :columns="columns" :cards="cards" :on-move="move" />
</template>
