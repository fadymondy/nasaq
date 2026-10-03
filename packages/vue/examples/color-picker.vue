<script setup lang="ts">
import { ref } from "vue";
import { NqColorPicker, NqField, NqFieldLabel } from "@fadymondy/nasaq/vue";

const color = ref<string | null>("--nq-tag-teal");
</script>

<template>
  <NqField>
    <NqFieldLabel>Label colour</NqFieldLabel>
    <NqColorPicker v-model="color" aria-label="Label colour" />
  </NqField>
</template>
