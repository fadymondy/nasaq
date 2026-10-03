<script setup lang="ts">
import { NqAgentPersonaEditor, type AgentPersona } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const agent = ref<AgentPersona>({
  name: "Support agent",
  tagline: "Answers billing questions",
  color: "--nq-tag-blue",
  icon: "headphones",
  persona: "## Role\n\nYou help customers with invoices.",
  traits: ["calm", "precise"],
  model: "fast",
  greeting: "Hi, how can I help?",
});
const models = [
  { id: "fast", label: "Fast" },
  { id: "smart", label: "Smart" },
];

async function save(draft: AgentPersona) {
  agent.value = draft;
}
</script>

<template>
  <NqAgentPersonaEditor :value="agent" :models="models" :on-save="save" />
</template>
