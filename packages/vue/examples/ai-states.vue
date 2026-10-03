<script setup lang="ts">
import { ref } from "vue";
import { NqAiActionMenu, NqAiStreamControls, NqAiStreamingText, type AiStreamState } from "@fadymondy/nasaq/vue";

const text = ref("Revenue grew **12%** this month, led by the new annual plan.");
const state = ref<AiStreamState>("done");
</script>

<template>
  <NqAiStreamControls :state="state" :on-stop="() => (state = 'stopped')" :on-regenerate="() => (state = 'streaming')" />
  <NqAiStreamingText :text="text" :streaming="state === 'streaming'" />
  <NqAiActionMenu :actions="[{ id: 'summarize', label: 'Summarize', recommended: true }]" :on-action="(id) => console.log(id)" />
</template>
