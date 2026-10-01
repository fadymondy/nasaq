<script setup lang="ts">
import { NqPagination } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const page = ref(1);
</script>

<template>
  <NqPagination v-model:page="page" :page-count="24" />
</template>
