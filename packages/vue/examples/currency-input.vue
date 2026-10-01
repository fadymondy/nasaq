<script setup lang="ts">
import { NqCurrencyInput } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const minor = ref<number | null>(1999);
</script>

<template>
  <NqCurrencyInput v-model="minor" aria-label="Fee" currency="USD" />
</template>
