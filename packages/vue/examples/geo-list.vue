<script setup lang="ts">
import { NqGeoList } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqGeoList
    value-label="Users"
    :rows="[
      { code: 'SA', value: 12400, previous: 11200 },
      { code: 'EG', value: 8100, previous: 8600 },
    ]"
  />
</template>
