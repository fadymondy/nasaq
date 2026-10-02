<script setup lang="ts">
import { NqDocsShell, type DocsPageData } from "@fadymondy/nasaq/vue";
import { computed, ref } from "vue";

const nav = [
  { id: "intro", title: "Introduction" },
  { id: "guides", title: "Guides", children: [{ id: "install", title: "Installation" }] },
];
const pages: Record<string, DocsPageData> = {
  intro: { id: "intro", title: "Introduction", markdown: "## Why\n\nText.\n\n> [!TIP]\n> Start small." },
  install: { id: "install", title: "Installation", markdown: "## Install\n\nRun `pnpm add`." },
};
const id = ref("intro");
const page = computed(() => pages[id.value] as DocsPageData);
</script>

<template>
  <NqDocsShell :nav="nav" :page="page" @navigate="(next) => (id = next)">
    <template #brand>Nasaq Docs</template>
  </NqDocsShell>
</template>
