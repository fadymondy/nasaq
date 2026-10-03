<script setup lang="ts">
import type { BookingFlowLabels } from "./strings";

// The service, tax and total lines shared by the payment and review steps. Internal to NqBookingFlow.
defineProps<{ t: BookingFlowLabels; money: (n: number) => string; subtotal: number; tax: number; total: number; showTax: boolean }>();
</script>

<template>
  <dl v-if="!(total === 0 && subtotal === 0)" class="m-0 grid gap-1 rounded-control bg-secondary p-3 text-body-sm">
    <div class="flex justify-between">
      <dt class="text-muted-foreground">{{ t.subtotal }}</dt>
      <dd class="m-0"><bdi>{{ money(subtotal) }}</bdi></dd>
    </div>
    <div v-if="showTax" class="flex justify-between">
      <dt class="text-muted-foreground">{{ t.tax }}</dt>
      <dd class="m-0"><bdi>{{ money(tax) }}</bdi></dd>
    </div>
    <div class="flex justify-between text-label">
      <dt>{{ t.total }}</dt>
      <dd class="m-0"><bdi>{{ money(total) }}</bdi></dd>
    </div>
  </dl>
</template>
