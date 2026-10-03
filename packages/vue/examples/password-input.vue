<script setup lang="ts">
import { NqField, NqFieldLabel, NqPasswordInput } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqField>
    <NqFieldLabel>Password</NqFieldLabel>
    <NqPasswordInput autocomplete="current-password" />
  </NqField>
</template>
