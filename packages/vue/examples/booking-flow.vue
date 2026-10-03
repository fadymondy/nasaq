<script setup lang="ts">
import { NqBookingFlow } from "@fadymondy/nasaq/vue";

const locations = [
  { id: "l1", name: "Riyadh clinic", address: "King Fahd Rd", city: "Riyadh" },
  { id: "l2", name: "Jeddah clinic", address: "Tahlia St", city: "Jeddah" },
];
const services = [
  { id: "s1", name: "Dental check-up", durationMinutes: 30, price: 60, category: "Dental" },
  { id: "s2", name: "Skin consultation", durationMinutes: 45, price: 90, category: "Skin" },
];
const providers = [
  { id: "p1", name: "Dr. Omar Nasser", specialty: "Dentist", rating: 4.9, reviews: 212 },
  { id: "p2", name: "Dr. Huda Salem", specialty: "Dermatologist", rating: 4.7, reviews: 96, serviceIds: ["s2"] },
];

// Next three days, hourly from 09:00 to 13:00.
async function getSlots() {
  const out = [];
  for (let d = 1; d <= 3; d++) {
    for (let h = 9; h <= 13; h++) {
      const start = new Date();
      start.setDate(start.getDate() + d);
      start.setHours(h, 0, 0, 0);
      out.push({ start, end: new Date(start.getTime() + 30 * 60000), state: "available" as const, remaining: 1 });
    }
  }
  return out;
}

async function onSubmit() {
  return { code: "NQ-4821" };
}
</script>

<template>
  <NqBookingFlow :locations="locations" :services="services" :providers="providers" :get-slots="getSlots" :on-submit="onSubmit" />
</template>
