<script setup lang="ts">
import { NqWorkspaceList, NqWorkspaceSettings, type WorkspaceListItem } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const workspace = ref({ name: "Acme Studio", slug: "acme-studio" });
const workspaces: WorkspaceListItem[] = [
  { id: "w1", name: "Acme Studio", slug: "acme-studio", role: "Owner", members: 12, current: true },
  { id: "w2", name: "Sahab Labs", slug: "sahab-labs", role: "Member", members: 1 },
];

async function checkSlug(slug: string) {
  return slug !== "taken";
}
async function onRename(values: { name: string; slug: string }) {
  workspace.value = values;
}
const noop = async () => undefined;
</script>

<template>
  <div class="flex flex-col gap-8">
    <NqWorkspaceList :workspaces="workspaces" :on-open="noop" :on-create="() => undefined" />
    <NqWorkspaceSettings :workspace="workspace" slug-prefix="nasaq.app/" :check-slug="checkSlug" :on-rename="onRename" :on-leave="noop" :on-delete="noop" />
  </div>
</template>
