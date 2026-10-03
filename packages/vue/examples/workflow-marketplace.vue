<script setup lang="ts">
import { NqWorkflowMarketplace, type WorkflowListing } from "@fadymondy/nasaq/vue";
import { Mail, Zap } from "lucide-vue-next";

const categories = [
  { id: "comms", label: "Messaging" },
  { id: "flow", label: "Flow" },
];
const listings: WorkflowListing[] = [
  {
    id: "send-email", kind: "step", name: "Send email", summary: "Send a templated email.", category: "comms", icon: Mail, installs: 1800,
    step: { role: "action", inputs: ["Contact"], outputs: ["Message id"], fields: [{ name: "to", label: "To", kind: "text", required: true }, { name: "subject", label: "Subject", kind: "text" }] },
  },
  {
    id: "new-order", kind: "step", name: "New order", summary: "Starts when an order is placed.", category: "flow", icon: Zap, installs: 900,
    step: { role: "trigger", outputs: ["Order"] },
  },
  {
    id: "welcome", kind: "preset", name: "Welcome series", summary: "Greet every new customer.", category: "comms", installs: 2400,
    preset: { steps: [{ id: "a", title: "Customer signs up" }, { id: "b", title: "Send email", kind: "system" }, { id: "c", title: "Done", kind: "output" }] },
  },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function install(_l: WorkflowListing) {
  await wait(600);
}
</script>

<template>
  <NqWorkflowMarketplace :categories="categories" :listings="listings" :on-install="install" />
</template>
