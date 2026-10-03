<script setup lang="ts">
import { ref } from "vue";
import { NqVersionHistory, type HistoryVersion } from "@fadymondy/nasaq/vue";

const versions = ref<HistoryVersion[]>([
  { id: "v3", version: 3, savedAt: "2026-09-29T08:30:00Z", author: "Sara", note: "Raised the free tier limit", content: '{\n  "plan": "free",\n  "limit": 200,\n  "currency": "USD"\n}' },
  { id: "v2", version: 2, savedAt: "2026-09-28T10:00:00Z", author: "Omar", note: "Added currency", content: '{\n  "plan": "free",\n  "limit": 100,\n  "currency": "USD"\n}' },
  { id: "v1", version: 1, savedAt: "2026-09-27T09:00:00Z", author: "Sara", content: '{\n  "plan": "free",\n  "limit": 100\n}' },
]);

// Your API call: restoring saves the old content as a new, newest version.
const restore = async (v: HistoryVersion) => {
  const n = versions.value.length + 1;
  versions.value = [{ ...v, id: `v${n}`, version: n, savedAt: new Date(), note: `Restored version ${v.version}` }, ...versions.value];
};
</script>

<template>
  <NqVersionHistory :versions="versions" language="json" :on-restore="restore" />
</template>
