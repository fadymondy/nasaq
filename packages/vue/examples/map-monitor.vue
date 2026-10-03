<script setup lang="ts">
import { NqMapMonitor, type MapAlert, type MapRegionPreset } from "@fadymondy/nasaq/vue";

const now = Date.now();
const HOUR = 3_600_000;
const regions: MapRegionPreset[] = [
  { id: "ksa", label: "Saudi Arabia", labelAr: "السعودية", center: { lat: 23.9, lng: 45.1 }, zoom: 5 },
  { id: "riyadh", label: "Riyadh", labelAr: "الرياض", center: { lat: 24.71, lng: 46.67 }, zoom: 10 },
];
const alerts: MapAlert[] = [
  { id: "a1", lat: 24.71, lng: 46.68, title: "Road closed", titleAr: "طريق مغلق", severity: "critical", at: now - HOUR, detail: "King Fahd Rd" },
  { id: "a2", lat: 24.77, lng: 46.74, title: "Power outage", titleAr: "انقطاع الكهرباء", severity: "high", at: now - 5 * HOUR },
  { id: "a3", lat: 21.54, lng: 39.17, title: "Delayed shipment", titleAr: "شحنة متأخرة", severity: "low", at: now - 72 * HOUR },
];
</script>

<template>
  <NqMapMonitor :regions="regions" :alerts="alerts" default-range="7d" :now="now" class="max-w-5xl" />
</template>
