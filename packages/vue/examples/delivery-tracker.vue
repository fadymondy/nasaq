<script setup lang="ts">
import { NqDeliveryTracker } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqDeliveryTracker order-number="1042" status="on-the-way" :eta-seconds="540" :courier="{ name: 'Omar', nameAr: 'عمر', phone: '+970591234567' }" />
</template>
