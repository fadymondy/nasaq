<script setup lang="ts">
import { NqButton, NqPageHeader } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqPageHeader
    :breadcrumbs="[{ label: 'Sales', href: '/sales' }, { label: 'Customers' }]"
    title="Customers"
    description="Everyone who bought from you or opened an account."
  >
    <template #actions><NqButton>New customer</NqButton></template>
  </NqPageHeader>
</template>
