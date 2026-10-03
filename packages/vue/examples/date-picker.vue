<script setup lang="ts">
import { ref } from "vue";
import { NqDatePicker, NqDateRangePicker, NqField, NqFieldDescription, NqFieldLabel, NqTimePicker, type DateRange } from "@fadymondy/nasaq/vue";

const date = ref<Date | null>(null);
const range = ref<DateRange>({ from: null, to: null });
const time = ref<string | null>("14:30");
</script>

<template>
  <div class="flex max-w-sm flex-col gap-4">
    <NqField>
      <NqFieldLabel>Start date</NqFieldLabel>
      <NqDatePicker v-model="date" :min="new Date()" />
      <NqFieldDescription>Work begins on this day.</NqFieldDescription>
    </NqField>
    <NqField>
      <NqFieldLabel>Period</NqFieldLabel>
      <NqDateRangePicker v-model="range" />
    </NqField>
    <NqField>
      <NqFieldLabel>Meeting time</NqFieldLabel>
      <NqTimePicker v-model="time" :minute-step="15" />
    </NqField>
  </div>
</template>
