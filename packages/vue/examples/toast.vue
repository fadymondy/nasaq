<script setup lang="ts">
import { NqButton, NqToaster, toast } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqButton @click="toast.success('Invoice sent')">Send invoice</NqButton>
  <NqToaster />
</template>
