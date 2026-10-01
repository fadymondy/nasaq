<script setup lang="ts">
import { NqTimeline, NqTimelineItem } from "@fadymondy/nasaq/vue";
import { GitPullRequest } from "lucide-vue-next";

const fiveMinutesAgo = new Date(Date.now() - 300_000);
</script>

<template>
  <NqTimeline>
    <NqTimelineItem :actor="{ name: 'Sara Alharbi' }" title="Assigned MH-142 to Khaled" :time="fiveMinutesAgo" />
    <NqTimelineItem title="Pull request #48 opened" description="Post-login redirect" time="2026-09-27T10:00:00Z">
      <template #icon><GitPullRequest /></template>
    </NqTimelineItem>
  </NqTimeline>
</template>
