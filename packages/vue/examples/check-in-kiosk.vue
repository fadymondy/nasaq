<script setup lang="ts">
import { NqCheckInKiosk, type CheckInRequest, type CheckInResult, type KioskBooking, type QueueEntry } from "@fadymondy/nasaq/vue";

const t = Date.now();
const bookings: KioskBooking[] = [
  { id: "b1", code: "BK-7F3Q9K", phone: "0100 123 4567", name: "Layla Hassan", startsAt: t + 10 * 60000 },
  { id: "b2", code: "BK-4M8TX2", phone: "0111 222 3333", name: "Omar Nasser", startsAt: t + 25 * 60000 },
];

let counter = 21;
// In a real app this posts to your server, which creates the queue entry and returns it.
const checkIn = async (request: CheckInRequest): Promise<CheckInResult | { error: string }> => {
  const number = counter++;
  const entry: QueueEntry = { id: `q${number}`, ticket: `A-0${number}`, number, name: request.booking?.name, status: "waiting", priority: request.booking ? "appointment" : "normal", queuedAt: Date.now(), checkedInAt: Date.now() };
  return { entry, position: 3, waitMinutes: 20 };
};
</script>

<template>
  <NqCheckInKiosk :bookings="bookings" :on-check-in="checkIn" />
</template>
