<script setup lang="ts">
import { NqLimitsEditor, type LimitRules } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const resources = [
  { key: "seats", label: "Seats", unit: "seats" },
  { key: "storage", label: "Storage", unit: "GB" },
];
const rules = ref<LimitRules>({ seats: { mode: "limit", value: 25 }, storage: { mode: "inherit" } });

async function save(next: LimitRules) {
  console.log("save", next);
}
</script>

<template>
  <NqLimitsEditor v-model="rules" :resources="resources" :inherited="{ storage: 100 }" :on-save="save" />
</template>
