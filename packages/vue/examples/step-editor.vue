<script setup lang="ts">
import { NqStepEditor, type StepNode, type StepParam } from "@fadymondy/nasaq/vue";
import { Globe } from "lucide-vue-next";
import { ref } from "vue";

const types = [{ id: "http", label: "HTTP request", category: "data", icon: Globe, fields: [{ name: "url", label: "URL", kind: "url" as const, required: true }] }];

const steps = ref<StepNode[]>([]);
const params = ref<StepParam[]>([{ id: "p1", name: "host", value: "api.example.com" }]);
</script>

<template>
  <NqStepEditor :types="types" v-model:steps="steps" v-model:params="params" />
</template>
