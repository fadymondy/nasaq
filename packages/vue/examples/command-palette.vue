<script setup lang="ts">
import { FilePlus2, Inbox } from "lucide-vue-next";
import { defineComponent, h } from "vue";
import {
  NqAppShell,
  NqCommandPalette,
  NqSearchTrigger,
  NqSidebar,
  NqSidebarHeader,
  useRegisterCommands,
  type Command,
} from "@fadymondy/nasaq/vue";

const commands: Command[] = [
  { id: "app.go.inbox", section: "navigation", label: "Inbox", icon: Inbox, shortcut: "G I", perform: () => console.log("inbox") },
  { id: "app.new.issue", section: "create", label: "New issue", icon: FilePlus2, shortcut: "C", perform: () => console.log("new issue") },
];

// Inside NqAppShell, which supplies the command registry and the shared open state. Register from a child of the shell.
const Palette = defineComponent({
  setup() {
    useRegisterCommands(commands);
    return () => h(NqCommandPalette);
  },
});
</script>

<template>
  <NqAppShell class="min-h-96">
    <template #sidebar>
      <NqSidebar>
        <NqSidebarHeader><NqSearchTrigger /></NqSidebarHeader>
      </NqSidebar>
    </template>
    <p class="p-6">Press Ctrl+K or Cmd+K.</p>
    <Palette />
  </NqAppShell>
</template>
