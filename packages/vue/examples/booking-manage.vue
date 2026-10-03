<script setup lang="ts">
import { NqBookingManage } from "@fadymondy/nasaq/vue";

const start = new Date();
start.setDate(start.getDate() + 5);
start.setHours(10, 0, 0, 0);
const booking = {
  id: "b1",
  code: "NQ-4821",
  status: "confirmed" as const,
  start,
  end: new Date(start.getTime() + 30 * 60000),
  service: "Dental check-up",
  provider: "Dr. Omar Nasser",
  location: "Riyadh clinic",
  patient: "Huda Salem",
  phone: "+966 50 123 4567",
  price: 60,
  payment: "visit" as const,
};
const getSlots = async () => [{ start: new Date(start.getTime() + 86400000), end: new Date(start.getTime() + 86400000 + 30 * 60000), state: "available" as const, remaining: 1 }];
</script>

<template>
  <NqBookingManage
    :booking="booking"
    :policy="{ cancelHours: 24, lateFeePercent: 50 }"
    :get-slots="getSlots"
    :on-reschedule="async () => {}"
    :on-cancel="async () => {}"
  />
</template>
