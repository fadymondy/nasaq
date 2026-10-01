<script setup lang="ts">
import { NqLocaleSwitcher, NqThemeToggle } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex items-center gap-3">
    <NqThemeToggle />
    <NqLocaleSwitcher show-label />
  </div>
</template>
