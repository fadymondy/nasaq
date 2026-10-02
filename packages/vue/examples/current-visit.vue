<script setup lang="ts">
import { NqCurrentVisit } from "@fadymondy/nasaq/vue";

const patient = { id: "p1", name: "Huda Salem", age: 34, gender: "Female", phone: "+966 50 123 4567", allergies: ["Penicillin"], conditions: ["Asthma"] };
const history = [{ id: "h1", date: new Date(2026, 5, 3), title: "Check-up", summary: "Blood pressure normal." }];
const startedAt = Date.now() - 4 * 60000;
async function finish(result: unknown) {
  console.log(result);
}
</script>

<template>
  <NqCurrentVisit :patient="patient" service="Consultation" room="Room 3" :started-at="startedAt" :history="history" :on-finish="finish" />
</template>
