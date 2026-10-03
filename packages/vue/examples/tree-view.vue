<script setup lang="ts">
import { FileText, Folder } from "lucide-vue-next";
import { NqTreeView, type TreeNode } from "@fadymondy/nasaq/vue";

const items: TreeNode[] = [
  {
    id: "docs",
    label: "Documents",
    textValue: "Documents",
    icon: Folder,
    children: [{ id: "cv", label: "CV.pdf", textValue: "CV.pdf", icon: FileText }],
  },
  { id: "notes", label: "Notes.txt", textValue: "Notes.txt", icon: FileText },
];
</script>

<template>
  <NqTreeView aria-label="Files" :items="items" :default-expanded="['docs']" />
</template>
