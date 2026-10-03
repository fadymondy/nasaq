<script setup lang="ts">
import { NqCheckbox, NqField, NqFieldLabel } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqField class="flex-row items-center gap-2">
    <NqCheckbox id="copy" default-checked />
    <NqFieldLabel for="copy">Email me a copy</NqFieldLabel>
  </NqField>
</template>
