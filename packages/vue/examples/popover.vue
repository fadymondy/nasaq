<script setup lang="ts">
import {
  NqButton, NqPopover, NqPopoverClose, NqPopoverContent, NqPopoverDescription, NqPopoverTitle, NqPopoverTrigger,
} from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqPopover>
    <NqPopoverTrigger as-child><NqButton variant="outline">Details</NqButton></NqPopoverTrigger>
    <NqPopoverContent>
      <NqPopoverTitle>Deployment window</NqPopoverTitle>
      <NqPopoverDescription>Releases go out Sunday to Thursday.</NqPopoverDescription>
      <NqPopoverClose as-child><NqButton size="sm">Got it</NqButton></NqPopoverClose>
    </NqPopoverContent>
  </NqPopover>
</template>
