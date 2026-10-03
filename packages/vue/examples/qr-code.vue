<script setup lang="ts">
import { NqQrCode } from "@fadymondy/nasaq/vue";

const url = "https://nasaq.fadymondy.com";
</script>

<template>
  <NqQrCode :value="url" downloadable download-name="my-link" />
</template>
