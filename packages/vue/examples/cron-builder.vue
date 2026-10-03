<script setup lang="ts">
import { NqCronBuilder } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const cron = ref("0 9 * * 1-5");
const zone = ref("Asia/Riyadh");
</script>

<template>
  <NqCronBuilder v-model="cron" v-model:time-zone="zone" />
</template>
