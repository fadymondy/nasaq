<script setup lang="ts">
import { NqInput, NqRepeater } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const rows = ref([{ name: "Sara" }]);
</script>

<template>
  <NqRepeater v-model="rows" :create-item="() => ({ name: '' })" :row-title="(row) => row.name" :min="1" :max="5" class="w-96">
    <template #default="{ item, update }">
      <NqInput :model-value="item.name" @update:model-value="(v: string) => update({ name: v })" />
    </template>
  </NqRepeater>
</template>
