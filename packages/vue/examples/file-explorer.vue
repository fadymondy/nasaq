<script setup lang="ts">
import { NqFileExplorer, type FileNode } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const nodes = ref<FileNode[]>([
  {
    id: "docs",
    name: "Documents",
    kind: "folder",
    children: [
      { id: "brief", name: "brief.pdf", kind: "file", size: 482_000, modifiedAt: "2026-09-20T10:00:00Z", mime: "application/pdf" },
      { id: "notes", name: "notes.md", kind: "file", size: 1_240, modifiedAt: "2026-09-22T08:30:00Z", previewText: "# Launch notes\n\n- Ship the file explorer\n- Write the docs\n" },
    ],
  },
  { id: "images", name: "Images", kind: "folder", children: [{ id: "logo", name: "logo.svg", kind: "file", size: 3_400, modifiedAt: "2026-09-10T12:00:00Z", mime: "image/svg+xml" }] },
  { id: "report", name: "report.xlsx", kind: "file", size: 91_300, modifiedAt: "2026-09-27T14:15:00Z" },
]);

async function onUpload(files: File[], folderId: string | null) {
  const added = files.map((f, i) => ({ id: `up-${Date.now()}-${i}`, name: f.name, kind: "file" as const, size: f.size, modifiedAt: Date.now() }));
  if (!folderId) nodes.value = [...nodes.value, ...added];
  else nodes.value = nodes.value.map((n) => (n.id === folderId ? { ...n, children: [...(n.children ?? []), ...added] } : n));
}
async function onCreateFolder(name: string, parentId: string | null) {
  const folder: FileNode = { id: `f-${Date.now()}`, name, kind: "folder", children: [] };
  if (!parentId) nodes.value = [...nodes.value, folder];
  else nodes.value = nodes.value.map((n) => (n.id === parentId ? { ...n, children: [...(n.children ?? []), folder] } : n));
}
const without = (list: FileNode[], id: string): FileNode[] => list.filter((n) => n.id !== id).map((n) => (n.children ? { ...n, children: without(n.children, id) } : n));
async function onDelete(node: FileNode) {
  nodes.value = without(nodes.value, node.id);
}
function onDownload(node: FileNode) {
  window.open(`/files/${node.id}`);
}
</script>

<template>
  <NqFileExplorer :nodes="nodes" :on-upload="onUpload" :on-create-folder="onCreateFolder" :on-delete="onDelete" :on-download="onDownload" />
</template>
