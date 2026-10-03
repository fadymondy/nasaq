<script setup lang="ts">
import { NqBookingSlots } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

type State = "available" | "full" | "held" | "past";
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const slot = (hour: number, state: State) => {
  const start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), hour, 0);
  return { start, end: new Date(start.getTime() + 30 * 60000), state, remaining: state === "available" ? 1 : 0 };
};
const slots = [slot(9, "available"), slot(10, "full"), slot(11, "available"), slot(12, "held"), slot(14, "available")];
const start = ref<Date | null>(null);
</script>

<template>
  <NqBookingSlots :slots="slots" v-model="start" />
</template>
