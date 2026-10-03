<script setup lang="ts">
import { ref } from "vue";
import { NqSidebar, NqSidebarHeader, NqWorkspaceSwitcher, type Workspace } from "@fadymondy/nasaq/vue";

const workspaces: Workspace[] = [
  { id: "3x1", name: "3x1", description: "Pro · 12 members" },
  { id: "personal", name: "Fady Mondy", description: "Personal" },
];
const workspace = ref("3x1");
</script>

<template>
  <NqSidebar>
    <NqSidebarHeader>
      <NqWorkspaceSwitcher v-model="workspace" :workspaces="workspaces" />
    </NqSidebarHeader>
  </NqSidebar>
</template>
