<script setup lang="ts">
import { NqProjectList, type Project } from "@fadymondy/nasaq/vue";

const projects: Project[] = [
  { id: "1", name: "Website redesign", key: "WEB", client: "Acme", status: "active", progress: 62, dueDate: "2026-12-01", members: [{ name: "Sara Ali" }, { name: "Omar Nasser" }] },
];
</script>

<template>
  <NqProjectList :projects="projects" />
</template>
