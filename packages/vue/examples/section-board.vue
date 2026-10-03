<script setup lang="ts">
import { NqSectionBoard, type BoardSection } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const sections = ref<BoardSection[]>([
  { id: "news", title: "Morning news", badge: "Daily", prompt: "Summarise the top three headlines for our customers.", model: "fast", settings: { topic: "payments" }, content: "Card payments grew 12% this quarter." },
  { id: "tips", title: "Tip of the day", prompt: "Write one practical tip for new merchants.", content: "Enable split payments to lift conversion." },
  { id: "alerts", title: "Alerts", badge: "Beta" },
]);
const editing = ref(false);
const models = [
  { value: "fast", label: "Fast" },
  { value: "deep", label: "Deep reasoning" },
];

function add() {
  sections.value = [...sections.value, { id: crypto.randomUUID(), title: "New section" }];
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <button type="button" class="self-start text-body-sm underline" @click="editing = !editing">{{ editing ? "Done" : "Edit sections" }}</button>
    <NqSectionBoard :sections="sections" :editing="editing" :models="models" :columns="2" :on-change="(next) => (sections = next)" :on-add="add" />
  </div>
</template>
