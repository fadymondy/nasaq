<script setup lang="ts">
import { Archive } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFormatNumber } from "../numeric";
import { notebookScope, notebookTree, tagCounts, tagScope, type Note, type Notebook, type NotebookNode } from "./notes-model";
import { useNotesLabels, type NotesLabels } from "./strings";

// A row of chips: All, Pinned, Sealed, each notebook, each tag and Archive. The sidebar does the same job on wide screens.
interface Props {
  scope: string;
  notes: readonly Note[];
  notebooks: readonly Notebook[];
  counts: Record<string, number>;
  labels?: Partial<NotesLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:scope": [scope: string] }>();
const { t } = useNotesLabels(() => props.labels);
const fmt = useFormatNumber();

const flatten = (nodes: NotebookNode[]): Notebook[] => nodes.flatMap((n) => [n.notebook, ...flatten(n.children)]);
const items = computed(() => [
  { id: "all", label: t.value.all },
  { id: "pinned", label: t.value.pinned },
  { id: "sealed", label: t.value.sealed },
  ...flatten(notebookTree(props.notebooks)).map((n) => ({ id: notebookScope(n.id), label: n.name })),
  ...tagCounts(props.notes).map((x) => ({ id: tagScope(x.tag), label: `#${x.tag}` })),
  { id: "archive", label: t.value.archive },
]);
</script>

<template>
  <div
    role="group"
    :aria-label="t.scopes"
    data-slot="notes-scope-bar"
    :class="cn('flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', props.class)"
  >
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      :aria-pressed="props.scope === item.id"
      class="inline-flex h-control-sm shrink-0 items-center gap-1.5 rounded-control border border-border bg-card px-2.5 text-label text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:border-primary aria-pressed:bg-nq-selected"
      @click="emit('update:scope', item.id)"
    >
      <Archive v-if="item.id === 'archive'" aria-hidden="true" class="size-3.5" />
      {{ item.label }}
      <span class="text-caption text-muted-foreground">{{ fmt(props.counts[item.id] ?? 0) }}</span>
    </button>
  </div>
</template>
