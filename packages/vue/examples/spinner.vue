<script setup lang="ts">
import { NqSpinner } from "@fadymondy/nasaq/vue";
</script>

<template>
  <span role="status" class="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
    <NqSpinner />
    جارٍ الحفظ…
  </span>
</template>
