<script setup lang="ts">
import { NqNum } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqNum :value="48210.5" :format="{ style: 'currency', currency: 'SAR' }" />
</template>
