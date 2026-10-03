<script setup lang="ts">
import { NqProductLogo, NqProductMark } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex items-center gap-4">
    <NqProductMark brand="mahaam" :size="32" />
    <NqProductLogo brand="zekra" />
  </div>
</template>
