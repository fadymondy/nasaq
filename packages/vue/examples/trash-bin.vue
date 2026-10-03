<script setup lang="ts">
import { NqTrashBin } from "@fadymondy/nasaq/vue";
import { FileText } from "lucide-vue-next";
import { ref } from "vue";

const now = new Date("2026-09-29T09:00:00");
const day = 86_400_000;
const items = ref([
  { id: "1", name: "Q3 budget.xlsx", type: "doc", detail: "Finance / 2026", deletedAt: new Date(now.getTime() - 2 * day), deletedBy: "Huda Salem" },
  { id: "2", name: "Launch plan", type: "doc", detail: "Marketing", deletedAt: new Date(now.getTime() - 26 * day), deletedBy: "Omar Nasser" },
  { id: "3", name: "Old logo.png", type: "doc", deletedAt: new Date(now.getTime() - 12 * day) },
]);
const types = [{ id: "doc", label: "Document", labelAr: "مستند", icon: FileText }];
const gone = (ids: string[]) => {
  items.value = items.value.filter((i) => !ids.includes(i.id));
};
</script>

<template>
  <NqTrashBin :items="items" :types="types" :retention-days="30" :now="now" :on-restore="gone" :on-delete="gone" :on-empty="() => (items = [])" />
</template>
