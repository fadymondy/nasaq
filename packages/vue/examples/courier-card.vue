<script setup lang="ts">
import { NqCourierList } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const id = ref<string | null>("c1");
const couriers = [
  { id: "c1", name: "Omar Haddad", nameAr: "عمر حداد", status: "available", vehicle: "motorbike", distanceMeters: 850, etaSeconds: 240, cashFloatMinor: 25000 },
] as const;
</script>

<template>
  <NqCourierList v-model:selected-id="id" :couriers="couriers" />
</template>
