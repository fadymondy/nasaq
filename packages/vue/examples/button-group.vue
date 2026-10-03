<script setup lang="ts">
import { NqButton, NqButtonGroup } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqButtonGroup aria-label="Period">
    <NqButton>Day</NqButton>
    <NqButton>Week</NqButton>
    <NqButton>Month</NqButton>
  </NqButtonGroup>
</template>
