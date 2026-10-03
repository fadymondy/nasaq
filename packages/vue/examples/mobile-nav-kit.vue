<script setup lang="ts">
import { Archive } from "lucide-vue-next";
import { NqSwipeActionRow } from "@fadymondy/nasaq/vue";

const endActions = [{ id: "archive", label: "Archive", icon: Archive, onSelect: () => {} }];
</script>

<template>
  <NqSwipeActionRow :end-actions="endActions">
    <div class="p-4">Design review moved to 3 PM</div>
  </NqSwipeActionRow>
</template>
