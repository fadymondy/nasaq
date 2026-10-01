<script setup lang="ts">
import { NqSourceBadge } from "@fadymondy/nasaq/vue";
import { Database, Rss } from "lucide-vue-next";
</script>

<template>
  <div class="flex gap-2">
    <NqSourceBadge label="Postgres" :icon="Database" />
    <NqSourceBadge label="Blog feed" :icon="Rss" color="var(--nq-accent-brand)" />
    <NqSourceBadge compact label="Postgres" :icon="Database" />
  </div>
</template>
