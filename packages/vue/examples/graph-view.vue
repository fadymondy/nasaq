<script setup lang="ts">
import { NqGraphView } from "@fadymondy/nasaq/vue";
import { FileText, User } from "lucide-vue-next";

const kinds = [
  { id: "person", label: "People", hue: "blue" as const, icon: User, shape: "circle" as const },
  { id: "doc", label: "Documents", hue: "amber" as const, icon: FileText, shape: "rounded" as const },
];
const nodes = [
  { id: "sara", label: "Sara", kind: "person", description: "Product lead" },
  { id: "spec", label: "Onboarding spec", kind: "doc", updatedAt: "2026-09-20T10:00:00Z" },
];
const links = [{ source: "sara", target: "spec", label: "wrote", kind: "authored" }];
const linkKinds = [{ id: "authored", style: "flow" as const, arrow: true }];
</script>

<template>
  <div class="h-[640px]">
    <NqGraphView :kinds="kinds" :nodes="nodes" :links="links" :link-kinds="linkKinds" :on-open="(node) => console.log(node.id)" />
  </div>
</template>
