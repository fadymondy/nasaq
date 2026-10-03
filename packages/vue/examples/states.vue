<script setup lang="ts">
import { NqButton, NqEmptyState, NqLoadingState } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqEmptyState title="لا توجد مهام بعد" description="تظهر هنا المهام التي تنشئها أو تُسند إليك.">
    <template #actions><NqButton variant="primary">مهمة جديدة</NqButton></template>
  </NqEmptyState>
  <NqLoadingState shape="grid" :rows="4" :columns="2" caption="Fetching the last 30 days…" />
  <NqLoadingState shape="timeline" :rows="3" />
</template>
