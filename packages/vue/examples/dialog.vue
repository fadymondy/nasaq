<script setup lang="ts">
import {
  NqButton, NqDialog, NqDialogClose, NqDialogContent, NqDialogDescription,
  NqDialogFooter, NqDialogHeader, NqDialogTitle, NqDialogTrigger,
} from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqDialog>
    <NqDialogTrigger as-child><NqButton variant="danger">Delete project</NqButton></NqDialogTrigger>
    <NqDialogContent>
      <NqDialogHeader>
        <NqDialogTitle>Delete this project?</NqDialogTitle>
        <NqDialogDescription>Issues, time entries and files are removed. This cannot be undone.</NqDialogDescription>
      </NqDialogHeader>
      <NqDialogFooter>
        <NqDialogClose as-child><NqButton variant="ghost">Keep project</NqButton></NqDialogClose>
        <NqDialogClose as-child><NqButton variant="danger">Delete</NqButton></NqDialogClose>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
