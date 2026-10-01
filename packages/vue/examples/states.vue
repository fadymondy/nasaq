<script setup lang="ts">
import { NqButton, NqEmptyState } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqEmptyState title="لا توجد مهام بعد" description="تظهر هنا المهام التي تنشئها أو تُسند إليك.">
    <template #actions><NqButton variant="primary">مهمة جديدة</NqButton></template>
  </NqEmptyState>
</template>
