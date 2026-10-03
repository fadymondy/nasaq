<script setup lang="ts">
import { NqNotificationItem } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqNotificationItem
    :actor="{ name: 'نور عادل' }"
    title="أشارت إليك نور عادل في MH-728"
    description="هل يمكننا إطلاق تلميحات الشريط اليوم؟"
    time="2m"
    unread
    unread-label="غير مقروء"
    @click="() => console.log('open')"
  />
</template>
