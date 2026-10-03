<script setup lang="ts">
import { NqSwitch } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const on = ref(true);
</script>

<template>
  <label class="flex items-center gap-3 text-body-sm text-foreground">
    <NqSwitch v-model="on" />
    Email notifications
  </label>
</template>
