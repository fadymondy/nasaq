<script setup lang="ts">
import {
  NqButton, NqDrawer, NqDrawerBody, NqDrawerClose, NqDrawerContent, NqDrawerDescription,
  NqDrawerFooter, NqDrawerHeader, NqDrawerTitle, NqDrawerTrigger,
} from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqDrawer>
    <NqDrawerTrigger as-child><NqButton variant="secondary">Open drawer</NqButton></NqDrawerTrigger>
    <NqDrawerContent>
      <NqDrawerHeader>
        <NqDrawerTitle>Edit project</NqDrawerTitle>
        <NqDrawerDescription>Drag the handle down to dismiss.</NqDrawerDescription>
      </NqDrawerHeader>
      <NqDrawerBody class="p-4">Content</NqDrawerBody>
      <NqDrawerFooter class="justify-end">
        <NqDrawerClose as-child><NqButton variant="ghost">Cancel</NqButton></NqDrawerClose>
      </NqDrawerFooter>
    </NqDrawerContent>
  </NqDrawer>
</template>
