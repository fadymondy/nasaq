<script setup lang="ts">
import { NqButton, useDebounce } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const q = ref("");
const debounced = useDebounce(q, 300);
</script>

<template>
  <div class="flex flex-col gap-2">
    <input v-model="q" aria-label="Search" class="h-control rounded-control border border-border bg-background px-3" />
    <p class="text-body-sm text-muted-foreground">Searching for: {{ debounced }}</p>
    <NqButton @click="q = ''">Clear</NqButton>
  </div>
</template>
