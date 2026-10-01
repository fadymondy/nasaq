<script setup lang="ts">
import { NqChip, NqChipGroup } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const category = ref("all");
</script>

<template>
  <NqChipGroup v-model="category" aria-label="Categories">
    <NqChip value="all">All</NqChip>
    <NqChip value="productivity">Productivity</NqChip>
    <NqChip value="finance">Finance</NqChip>
  </NqChipGroup>
</template>
