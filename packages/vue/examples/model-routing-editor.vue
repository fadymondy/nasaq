<script setup lang="ts">
import { NqModelRoutingEditor, type RoutingValue } from "@fadymondy/nasaq/vue";

const taskClasses = [
  { id: "chat", label: "Chat" },
  { id: "vision", label: "Image understanding", modality: "vision" as const },
];
const models = [
  { id: "sonnet", label: "Sonnet 5.5", modalities: ["text", "vision"] as const },
  { id: "haiku", label: "Haiku 4.5" },
];
const providers = [{ id: "cloud", name: "Cloud API", kind: "cloud" as const, modalities: ["text", "vision"] as const, status: "online" as const }];
const defaultValue: RoutingValue = { auto: false, routes: { chat: { model: "sonnet", fallback: "haiku" } }, backend: "cloud" };

async function save(value: RoutingValue) {
  await Promise.resolve(value);
}
async function register(input: { name: string }) {
  await Promise.resolve(input);
}
</script>

<template>
  <NqModelRoutingEditor
    :task-classes="taskClasses"
    :models="models"
    :providers="providers"
    :default-value="defaultValue"
    :on-save="save"
    :on-register-provider="register"
  />
</template>
