<script setup lang="ts">
import { NqField, NqFieldLabel, NqTagInput } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqField>
    <NqFieldLabel>Labels</NqFieldLabel>
    <NqTagInput :default-value="['design', 'urgent']" />
  </NqField>
</template>
