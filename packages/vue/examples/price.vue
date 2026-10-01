<script setup lang="ts">
import { NqPrice } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqPrice :amount="12" period="seat-month" />
</template>
