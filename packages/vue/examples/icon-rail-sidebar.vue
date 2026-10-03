<script setup lang="ts">
import { Home, Users } from "lucide-vue-next";
import { NqIconRailSidebar } from "@fadymondy/nasaq/vue";

const sections = [
  { id: "home", label: "Home", icon: Home, groups: [{ id: "g", items: [{ id: "dash", label: "Dashboard" }] }] },
  { id: "people", label: "People", icon: Users, groups: [{ id: "g", items: [{ id: "users", label: "Users" }, { id: "roles", label: "Roles" }] }] },
];
</script>

<template>
  <NqIconRailSidebar :sections="sections" default-value="people" class="min-h-80" @item-select="(id) => console.log(id)">
    <main class="p-6">Content</main>
  </NqIconRailSidebar>
</template>
