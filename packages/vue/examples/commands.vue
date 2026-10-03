<script setup lang="ts">
import { NqButton, provideCommands, useRegisterCommands, useRegisteredCommands, type Command } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const registry = provideCommands();
const created = ref(0);
const commands: Command[] = [{ id: "mahaam.issue.new", section: "create", label: "New issue", shortcut: "C", keywords: ["add", "مهمة"], perform: () => (created.value += 1) }];
useRegisterCommands(commands, registry);
const registered = useRegisteredCommands(registry);
</script>

<template>
  <div class="flex items-center gap-3">
    <NqButton @click="registered.commands[0]?.perform?.()">New issue</NqButton>
    <span class="text-body-sm text-muted-foreground">{{ registered.commands.length }} command, {{ created }} created (press C)</span>
  </div>
</template>
