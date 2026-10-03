<script setup lang="ts">
import { NqBookingPipeline, NqBookingStatusBadge } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

type Status = "requested" | "confirmed" | "checked_in" | "in_visit" | "done" | "no_show" | "cancelled";
const status = ref<Status>("confirmed");
const history = ref([
  { status: "requested" as Status, at: new Date(Date.now() - 3 * 3600000), by: "Sara" },
  { status: "confirmed" as Status, at: new Date(Date.now() - 2 * 3600000), by: "Khaled" },
]);

async function advance(to: Status) {
  status.value = to;
  history.value = [...history.value, { status: to, at: new Date(), by: "You" }];
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NqBookingStatusBadge :status="status" />
    <NqBookingPipeline :status="status" :history="history" :on-advance="advance" />
  </div>
</template>
