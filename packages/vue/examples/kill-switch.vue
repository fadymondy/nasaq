<script setup lang="ts">
import { NqKillSwitch, NqPausedBanner, type PairedBrowser, type PauseInfo } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const paused = ref<PauseInfo | null>(null);
const browsers = ref<PairedBrowser[]>([
  { id: "1", name: "Chrome on Windows", device: "Work laptop", online: true, current: true },
  { id: "2", name: "Edge on Windows", online: false, lastSeen: Date.now() - 3 * 3600_000 },
]);
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 500));
const stop = async (reason: string) => {
  await wait();
  paused.value = { by: "Sara Ali", at: Date.now(), reason };
};
const resume = async () => {
  await wait();
  paused.value = null;
};
const unpair = async (id: string) => {
  await wait();
  browsers.value = browsers.value.filter((b) => b.id !== id);
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <NqPausedBanner v-if="paused" :paused="paused" :on-resume="resume" :sticky="false" />
    <NqKillSwitch :paused="paused" :active-count="14" :on-stop-all="stop" :on-resume="resume" :browsers="browsers" :on-unpair-browser="unpair" />
  </div>
</template>
