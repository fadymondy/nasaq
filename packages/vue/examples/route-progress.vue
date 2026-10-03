<script setup lang="ts">
import { NqButton, NqRouteProgress, useRouteProgress } from "@fadymondy/nasaq/vue";

const jobs = useRouteProgress();
const refresh = () => jobs.run(new Promise((resolve) => setTimeout(resolve, 2000)));
</script>

<template>
  <div class="relative">
    <NqRouteProgress :active="jobs.active.value" placement="absolute" />
    <NqButton @click="refresh">Refresh</NqButton>
  </div>
</template>
