<script setup lang="ts">
import { NqCashCollect } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const saved = ref<number | null>(null);
</script>

<template>
  <div class="flex max-w-sm flex-col gap-2">
    <NqCashCollect :order-total-minor="8500" :delivery-fee-minor="1500" @confirm="(minor) => (saved = minor)" />
    <p v-if="saved !== null" class="text-caption text-muted-foreground">Saved {{ saved }}</p>
  </div>
</template>
