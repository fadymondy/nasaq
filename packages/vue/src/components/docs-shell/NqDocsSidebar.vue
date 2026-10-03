<script setup lang="ts">
import { Search, X } from "lucide-vue-next";
import { computed, h, ref, watch } from "vue";
import { NqBadge } from "../badge";
import { NqIcon } from "../icon";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { NqTreeView, type TreeNode } from "../tree-view";
import { docsAncestorIds, docsPages, docsSectionIds, filterDocsTree, type DocsNavNode } from "./docs-model";
import { docsShellFill, type DocsShellStrings } from "./labels";

// The sidebar of the docs shell: the filter box and the navigation tree. Internal to NqDocsShell.
const props = defineProps<{ nav: DocsNavNode[]; activeId: string; searchable: boolean; t: DocsShellStrings }>();
const emit = defineEmits<{ navigate: [id: string] }>();

const query = ref("");
const expanded = ref<string[]>(docsAncestorIds(props.nav, props.activeId));
const filtering = computed(() => query.value.trim() !== "");
const tree = computed(() => filterDocsTree(props.nav, query.value));
const pageIds = computed(() => new Set(docsPages(props.nav).map((p) => p.id)));

// Keep the current page's sections open when it changes.
watch(
  () => [props.nav, props.activeId] as const,
  () => {
    const need = docsAncestorIds(props.nav, props.activeId);
    if (!need.every((id) => expanded.value.includes(id))) expanded.value = [...new Set([...expanded.value, ...need])];
  },
);

const toItem = (n: DocsNavNode): TreeNode => ({
  id: n.id,
  textValue: n.title,
  label: () => h("span", { class: "flex min-w-0 items-center gap-2" }, [h("span", { dir: "auto", class: "truncate" }, n.title), n.badge ? h(NqBadge, { variant: "info" }, () => n.badge) : null]),
  children: n.children?.length ? n.children.map(toItem) : undefined,
});
const items = computed(() => tree.value.map(toItem));

function onSelected(next: string[]) {
  const id = next[next.length - 1];
  if (!id) return;
  if (pageIds.value.has(id)) emit("navigate", id);
  else if (!filtering.value) expanded.value = expanded.value.includes(id) ? expanded.value.filter((x) => x !== id) : [...expanded.value, id];
}
</script>

<template>
  <nav :aria-label="props.t.nav" class="flex flex-col gap-3">
    <slot name="header" />
    <NqInputGroup v-if="props.searchable" class="h-control-sm">
      <NqInputGroupAddon>
        <NqIcon :icon="Search" />
      </NqInputGroupAddon>
      <NqInputGroupInput v-model="query" type="search" :placeholder="props.t.filter" :aria-label="props.t.filter" />
      <NqInputGroupAddon v-if="query" align="end">
        <button type="button" :aria-label="props.t.clearFilter" class="rounded-[2px] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus" @click="query = ''">
          <NqIcon :icon="X" />
        </button>
      </NqInputGroupAddon>
    </NqInputGroup>
    <NqTreeView
      v-if="items.length"
      :aria-label="props.t.nav"
      :items="items"
      :expanded="filtering ? docsSectionIds(tree) : expanded"
      :selected="[props.activeId]"
      @update:expanded="(next) => !filtering && (expanded = next)"
      @update:selected="onSelected"
    />
    <p v-else class="px-2 text-body-sm text-muted-foreground">{{ docsShellFill(props.t.noMatch, { query }) }}</p>
  </nav>
</template>
