<script setup lang="ts">
import { makeWeek, NqAvailabilityEditor, type Availability } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const value = ref<Availability>({
  weekly: makeWeek([0, 1, 2, 3, 4], [{ start: "09:00", end: "17:00" }], [{ start: "13:00", end: "14:00" }]),
  vacations: [{ id: "v1", from: "2026-10-04", to: "2026-10-06", reason: "Conference" }],
});
const save = async () => {
  await new Promise((r) => setTimeout(r, 400));
};
</script>

<template>
  <NqAvailabilityEditor v-model="value" :on-save="save" />
</template>
