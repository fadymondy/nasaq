<script setup lang="ts">
import { NqButton, NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqCollapsible>
    <NqCollapsibleTrigger as-child><NqButton variant="ghost">Advanced settings</NqButton></NqCollapsibleTrigger>
    <NqCollapsiblePanel>
      <p class="py-2 text-body-sm">Only shown when open.</p>
    </NqCollapsiblePanel>
  </NqCollapsible>
</template>
