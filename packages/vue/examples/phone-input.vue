<script setup lang="ts">
import { NqPhoneInput } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const phone = ref("+966501234567");
</script>

<template>
  <NqPhoneInput v-model="phone" aria-label="Phone number" />
</template>
