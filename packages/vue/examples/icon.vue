<script setup lang="ts">
import { NqIcon } from "@fadymondy/nasaq/vue";
import { ArrowRight, Search } from "lucide-vue-next";
</script>

<template>
  <div class="flex items-center gap-4">
    <NqIcon :icon="ArrowRight" class="size-5" /> <!-- mirrors in RTL -->
    <NqIcon :icon="Search" class="size-5" /> <!-- never mirrors -->
  </div>
</template>
