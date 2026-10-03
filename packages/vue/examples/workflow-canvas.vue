<script setup lang="ts">
import { NqWorkflowCanvas, type WorkflowGraph, type WorkflowStepType } from "@fadymondy/nasaq/vue";
import { Globe, Mail, Webhook } from "lucide-vue-next";
import { ref } from "vue";

const types: WorkflowStepType[] = [
  { id: "webhook", label: "Webhook", category: "trigger", icon: Webhook, role: "trigger", fields: [{ name: "path", label: "Path", kind: "text", required: true }] },
  { id: "http", label: "HTTP request", category: "action", icon: Globe, fields: [{ name: "url", label: "URL", kind: "url", required: true }] },
  { id: "mail", label: "Send email", category: "action", icon: Mail },
];
const categories = [{ id: "trigger", label: "Triggers" }, { id: "action", label: "Actions" }];

const graph = ref<WorkflowGraph>({ nodes: [], edges: [] });

// Your API call.
const save = async (g: WorkflowGraph) => {
  await fetch("/api/flows", { method: "PUT", body: JSON.stringify(g) });
};
</script>

<template>
  <div class="h-[640px]">
    <NqWorkflowCanvas title="New workflow" :value="graph" :types="types" :categories="categories" :on-save="save" @change="graph = $event" />
  </div>
</template>
