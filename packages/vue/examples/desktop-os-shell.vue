<script setup lang="ts">
import { Folder } from "lucide-vue-next";
import { h } from "vue";
import { NqDesktopAppIcon, NqDesktopShell, type DesktopApp } from "@fadymondy/nasaq/vue";

const apps: DesktopApp[] = [
  { id: "files", title: "Files", icon: h(NqDesktopAppIcon, null, () => h(Folder)), content: h("p", { class: "p-4" }, "Files"), single: true },
];
</script>

<template>
  <div class="h-96"><NqDesktopShell :apps="apps" /></div>
</template>
