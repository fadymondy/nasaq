<script setup lang="ts">
import { NqAlert } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqAlert tone="danger" title="Sync failed">
    Could not reach the data source. Check the credentials.
  </NqAlert>
</template>
