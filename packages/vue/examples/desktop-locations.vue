<script setup lang="ts">
import { NqDesktopLocations, type DesktopLocation } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const locations = ref<DesktopLocation[]>([
  {
    id: "1",
    path: "C:\\Users\\sara\\projects\\app",
    label: "App",
    status: "ready",
    permissions: { read: true, write: true, index: true },
    primary: true,
    fileCount: 1280,
    indexedAt: Date.now() - 3_600_000,
  },
]);
const bridge = {
  pickFolder: async () => "C:\\Users\\sara\\notes",
  add: async (path: string) => {
    locations.value = [...locations.value, { id: path, path, status: "ready", permissions: { read: true, write: false, index: true } }];
  },
  remove: async (id: string) => {
    locations.value = locations.value.filter((l) => l.id !== id);
  },
};
</script>

<template>
  <NqDesktopLocations :locations="locations" :on-browse="bridge.pickFolder" :on-add="async (path) => bridge.add(path)" :on-remove="bridge.remove" />
</template>
