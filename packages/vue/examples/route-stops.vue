<script setup lang="ts">
import { NqRouteStops } from "@fadymondy/nasaq/vue";

const stops = [
  { id: "p1", kind: "pickup", name: "Bakery" },
  { id: "d1", kind: "dropoff", name: "Sara", cashMinor: 10000 },
] as const;
</script>

<template>
  <NqRouteStops :stops="stops" />
</template>
