<script setup lang="ts">
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqField name="project">
    <NqFieldLabel>Project name</NqFieldLabel>
    <NqInput placeholder="Nasaq" />
    <NqFieldDescription>Shown in the sidebar and on invoices.</NqFieldDescription>
  </NqField>
</template>
