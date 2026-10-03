<script setup lang="ts">
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "@fadymondy/nasaq/vue";

const TYPES = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature request" },
  { value: "question", label: "Question" },
];
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-label text-foreground">Type</span>
    <NqSelect default-value="bug" name="type">
      <NqSelectTrigger>
        <NqSelectValue />
      </NqSelectTrigger>
      <NqSelectContent>
        <NqSelectItem v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</NqSelectItem>
      </NqSelectContent>
    </NqSelect>
  </div>
</template>
