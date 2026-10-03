<script setup lang="ts">
import { NqClinicDashboard, type ClinicDoctor, type ClinicRoom } from "@fadymondy/nasaq/vue";

const t = Date.now();
const rooms: ClinicRoom[] = [
  { id: "r1", name: "Room 1", status: "busy", doctorId: "d1", ticket: "A-014", since: t - 12 * 60000 },
  { id: "r2", name: "Room 2", status: "busy", doctorId: "d2", ticket: "A-015", since: t - 4 * 60000 },
  { id: "r3", name: "Room 3", status: "free" },
  { id: "r4", name: "Room 4", status: "cleaning" },
  { id: "r5", name: "Room 5", status: "closed" },
];
const doctors: ClinicDoctor[] = [
  { id: "d1", name: "Dr. Mona Saleh", specialty: "Family medicine", status: "in_visit", roomId: "r1", shift: { start: "00:00", end: "23:59" }, waiting: 3 },
  { id: "d2", name: "Dr. Karim Adel", specialty: "Pediatrics", status: "in_visit", roomId: "r2", shift: { start: "00:00", end: "23:59" }, waiting: 2 },
  { id: "d3", name: "Dr. Huda Nabil", specialty: "Dermatology", status: "break", shift: { start: "00:00", end: "23:59" }, waiting: 0 },
];
const queuedAt = [t - 5 * 60000, t - 9 * 60000, t - 14 * 60000, t - 2 * 60000, t - 20 * 60000];
</script>

<template>
  <NqClinicDashboard :rooms="rooms" :doctors="doctors" :queued-at="queuedAt" :updated-at="t - 8000" />
</template>
