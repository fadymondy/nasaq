<script setup lang="ts">
import { NqMapView } from "@fadymondy/nasaq/vue";
import { Truck } from "lucide-vue-next";

const layers = [{ id: "vans", label: "Vans", labelAr: "الشاحنات", tone: "info" as const }];
const pins = [{ id: "v1", lat: 24.7136, lng: 46.6753, label: "Van 12", labelAr: "شاحنة 12", layer: "vans", tone: "info" as const, icon: Truck, status: "Moving", statusAr: "تتحرك" }];
const routes = [{ id: "r1", layer: "vans", label: "Route A", points: [{ lat: 24.71, lng: 46.67 }, { lat: 24.75, lng: 46.72 }] }];
</script>

<template>
  <NqMapView label="Fleet" :layers="layers" :pins="pins" :routes="routes" tile-url="https://tile.example.com/{z}/{x}/{y}.png" attribution="© Example maps" />
</template>
