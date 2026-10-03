<script setup lang="ts">
import { Archive, BookOpen, FolderPlus, Lock, Pencil, Pin, StickyNote, Tag, Trash2 } from "lucide-vue-next";
import { computed, h, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqContextMenuActions } from "../context-menu";
import { useFormatNumber } from "../numeric";
import { NqTreeView, type TreeNode } from "../tree-view";
import { notebookScope, notebookTree, scopeCounts, tagCounts, tagScope, type Note, type Notebook, type NotebookNode } from "./notes-model";
import { useNotesLabels, type NotesLabels } from "./strings";
import type { NoteAction } from "./use-note-menu";

// Filters (All, Pinned, Sealed, Archive), notebooks as a tree and tags. Each notebook has a context menu to add a sub-notebook, rename or delete it.
interface Props {
  notes: readonly Note[];
  notebooks: readonly Notebook[];
  /** The filter: `all`, `pinned`, `sealed`, `archive`, `nb:<id>` or `tag:<tag>`. */
  scope: string;
  onNotebookCreate?: (parentId: string | null) => void;
  onNotebookRename?: (notebook: Notebook) => void;
  onNotebookDelete?: (notebook: Notebook) => void;
  labels?: Partial<NotesLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:scope": [scope: string] }>();
const { t } = useNotesLabels(() => props.labels);
const fmt = useFormatNumber();
const counts = computed(() => scopeCounts(props.notes, props.notebooks));
const tags = computed(() => tagCounts(props.notes));
const count = (key: string) => fmt(counts.value[key] ?? 0);

function toNode(node: NotebookNode): TreeNode {
  const nb = node.notebook;
  const actions: NoteAction[] = [
    ...(props.onNotebookCreate ? [{ id: "sub", label: t.value.newNotebook, icon: FolderPlus, onSelect: () => props.onNotebookCreate?.(nb.id), group: "a" }] : []),
    ...(props.onNotebookRename ? [{ id: "rename", label: t.value.renameNotebook, icon: Pencil, onSelect: () => props.onNotebookRename?.(nb), group: "a" }] : []),
    ...(props.onNotebookDelete ? [{ id: "delete", label: t.value.deleteNotebook, icon: Trash2, danger: true, onSelect: () => props.onNotebookDelete?.(nb), group: "b" }] : []),
  ];
  return {
    id: notebookScope(nb.id),
    textValue: nb.name,
    icon: BookOpen as Component,
    label: () =>
      h(NqContextMenuActions, { actions, keyboard: false, as: "span", class: "flex min-w-0 flex-1 items-center gap-2" }, () => [
        h("span", { dir: "auto", class: "min-w-0 flex-1 truncate" }, nb.name),
        h("span", { class: "ms-auto text-caption text-muted-foreground" }, count(notebookScope(nb.id))),
      ]),
    children: node.children.length ? node.children.map(toNode) : undefined,
  } as TreeNode;
}
const items = computed(() => notebookTree(props.notebooks).map(toNode));
const selected = computed(() => (props.scope.startsWith("nb:") ? [props.scope] : []));

const FILTERS: { key: string; icon: Component }[] = [
  { key: "all", icon: StickyNote },
  { key: "pinned", icon: Pin },
  { key: "sealed", icon: Lock },
  { key: "archive", icon: Archive },
];
const filterClass =
  "flex h-control-sm items-center gap-2 rounded-control px-2.5 text-start text-label text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:bg-nq-selected";
</script>

<template>
  <nav :aria-label="t.scopes" data-slot="notes-sidebar" :class="cn('min-h-0 w-56 shrink-0 flex-col gap-4 overflow-y-auto border-e border-border p-3', props.class)">
    <div class="flex flex-col gap-0.5">
      <button v-for="f in FILTERS" :key="f.key" type="button" :aria-pressed="props.scope === f.key" :class="filterClass" @click="emit('update:scope', f.key)">
        <component :is="f.icon" aria-hidden="true" class="size-4" />
        <span class="min-w-0 flex-1 truncate">{{ t[f.key as "all" | "pinned" | "sealed" | "archive"] }}</span>
        <span class="ms-auto text-caption text-muted-foreground">{{ count(f.key) }}</span>
      </button>
    </div>
    <div class="flex flex-col gap-1">
      <div class="flex items-center px-2.5">
        <h3 class="flex-1 text-caption font-medium uppercase text-muted-foreground">{{ t.notebooks }}</h3>
        <button
          v-if="props.onNotebookCreate"
          type="button"
          :aria-label="t.newNotebook"
          class="grid size-6 place-items-center rounded-control text-muted-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click="props.onNotebookCreate(null)"
        >
          <FolderPlus aria-hidden="true" class="size-4" />
        </button>
      </div>
      <NqTreeView
        v-if="items.length"
        :aria-label="t.notebooks"
        :items="items"
        :default-expanded="items.map((i) => i.id)"
        :selected="selected"
        @update:selected="(ids: string[]) => ids[0] && emit('update:scope', ids[0])"
      />
      <p v-else class="px-2.5 text-body-sm text-muted-foreground">{{ t.noNotebooks }}</p>
    </div>
    <div v-if="tags.length" class="flex flex-col gap-0.5">
      <h3 class="px-2.5 pb-1 text-caption font-medium uppercase text-muted-foreground">{{ t.tags }}</h3>
      <button v-for="x in tags" :key="x.tag" type="button" :aria-pressed="props.scope === tagScope(x.tag)" :class="filterClass" @click="emit('update:scope', tagScope(x.tag))">
        <Tag aria-hidden="true" class="size-4" />
        <span class="min-w-0 flex-1 truncate">{{ x.tag }}</span>
        <span class="ms-auto text-caption text-muted-foreground">{{ count(tagScope(x.tag)) }}</span>
      </button>
    </div>
  </nav>
</template>
