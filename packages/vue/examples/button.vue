<script setup lang="ts">
import { NqButton } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex gap-2">
    <NqButton variant="ghost">Cancel</NqButton>
    <NqButton variant="primary">Save changes</NqButton>
    <NqButton variant="primary" shape="pill">Track order</NqButton>
  </div>
</template>
