<script setup lang="ts">
import { NqAiModelPicker, type AiModel, type AiModelSelection } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const models: AiModel[] = [
  { id: "opus-5.5", label: "Opus 5.5", tier: "flagship", efforts: ["low", "medium", "high", "max"], contextWindow: 1_000_000 },
  { id: "haiku-4.5", label: "Haiku 4.5", tier: "fast", contextWindow: 200_000 },
];
const selection = ref<AiModelSelection>({ model: "opus-5.5", effort: "high" });
</script>

<template>
  <NqAiModelPicker v-model="selection" :models="models" :agents="[{ id: 'reviewer', label: 'Code reviewer' }]" agent-required />
</template>
