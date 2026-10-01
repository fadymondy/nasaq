<script setup lang="ts">
import { NqViewToggle, type ViewMode } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const view = ref<ViewMode>("table");
</script>

<template>
  <NqViewToggle v-model="view" :views="['table', 'grid']" storage-key="customers:view" />
</template>
