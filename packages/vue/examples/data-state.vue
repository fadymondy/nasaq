<script setup lang="ts">
import { NqButton, NqDataState } from "@fadymondy/nasaq/vue";

const props = withDefaults(defineProps<{ loading?: boolean; error?: Error | null; items?: string[] }>(), {
  items: () => [],
});
</script>

<template>
  <NqDataState :loading="loading" :error="error" :empty="props.items.length === 0" @retry="() => {}">
    <template #empty-action><NqButton variant="primary" size="sm">New order</NqButton></template>
    <ul>
      <li v-for="item in props.items" :key="item">{{ item }}</li>
    </ul>
  </NqDataState>
</template>
