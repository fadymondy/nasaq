<script setup lang="ts">
import { ref } from "vue";
import { NqUpdatePill, NqUpdateSheet } from "@fadymondy/nasaq/vue";

// The updater is yours (Electron, Tauri, a service worker): feed status, progress and speed in.
const open = ref(false);
const status = ref<"available" | "downloading" | "ready" | "error">("available");
const percent = ref(0);
const release = {
  version: "2.4.0",
  build: 240,
  date: "2026-09-28",
  size: 48_200_000,
  notes: [
    { type: "new", text: "Offline mode for the dispatch board" },
    { type: "improved", text: "Faster start on older laptops" },
    { type: "fixed", text: "Receipts print in the right order" },
  ],
} as const;

function download() {
  status.value = "downloading";
  const timer = setInterval(() => {
    percent.value = Math.min(100, percent.value + 10);
    if (percent.value >= 100) {
      clearInterval(timer);
      status.value = "ready";
    }
  }, 400);
}
</script>

<template>
  <div class="flex items-center gap-3">
    <NqUpdatePill :status="status" :progress="percent" version="2.4.0" @click="open = true" />
    <NqUpdateSheet v-model:open="open" :release="release" :status="status" :progress="percent" :speed="3_200_000" :on-download="download" :on-restart="() => (status = 'available')" />
  </div>
</template>
