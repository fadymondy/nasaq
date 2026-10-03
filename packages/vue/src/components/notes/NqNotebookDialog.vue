<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqInput } from "../field";
import { notebookTree, type NotebookNode, type Notebook } from "./notes-model";
import { useNotesLabels, type NotesLabels } from "./strings";
import { useAction } from "./use-action";
import type { NoteResult } from "./use-note-menu";

// Notebook dialogs: create, rename (one input) and delete. Mount it with a `state`; it closes through `close`.
export interface NotebookDialogState {
  kind: "create" | "rename" | "delete";
  notebook?: Notebook;
  parentId?: string | null;
}
interface Props {
  state: NotebookDialogState;
  notebooks: readonly Notebook[];
  onCreate?: (name: string, parentId: string | null) => Promise<NoteResult>;
  onRename?: (id: string, name: string) => Promise<NoteResult>;
  onDelete?: (id: string) => Promise<NoteResult>;
  labels?: Partial<NotesLabels>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();
const { t } = useNotesLabels(() => props.labels);
const { busy, error, run } = useAction();
const uid = useId();
const name = ref(props.state.notebook?.name ?? "");
const parentId = ref<string | null>(props.state.parentId ?? null);
const creating = computed(() => props.state.kind === "create");

function flatten(nodes: NotebookNode[], depth = 0): { notebook: Notebook; depth: number }[] {
  return nodes.flatMap((n) => [{ notebook: n.notebook, depth }, ...flatten(n.children, depth + 1)]);
}
const parents = computed(() => flatten(notebookTree(props.notebooks)));

async function submit() {
  const value = name.value.trim();
  if (!value) return;
  const notebook = props.state.notebook;
  const ok = await run(() => (creating.value ? props.onCreate?.(value, parentId.value) : notebook && props.onRename?.(notebook.id, value)), t.value.failed);
  if (ok) emit("close");
}
async function remove() {
  const notebook = props.state.notebook;
  if (notebook) await run(() => props.onDelete?.(notebook.id), t.value.failed);
}
</script>

<template>
  <NqAlertDialog v-if="props.state.kind === 'delete' && props.state.notebook" :open="true" @update:open="(o: boolean) => !o && emit('close')">
    <NqAlertDialogContent data-slot="notebook-delete-dialog">
      <NqAlertDialogHeader>
        <NqAlertDialogTitle>{{ t.notebookDeleteTitle }}</NqAlertDialogTitle>
        <NqAlertDialogDescription>
          {{ t.notebookDeleteBody }}
          <span class="mt-1 block font-medium text-foreground">{{ props.state.notebook.name }}</span>
        </NqAlertDialogDescription>
      </NqAlertDialogHeader>
      <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
      <NqAlertDialogFooter>
        <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
        <NqAlertDialogAction @click="remove">{{ t.deleteNotebook }}</NqAlertDialogAction>
      </NqAlertDialogFooter>
    </NqAlertDialogContent>
  </NqAlertDialog>
  <NqDialog v-else :open="true" @update:open="(o: boolean) => !o && emit('close')">
    <NqDialogContent class="max-w-sm" data-slot="notebook-dialog">
      <form class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ creating ? t.newNotebook : t.renameNotebook }}</NqDialogTitle>
        </NqDialogHeader>
        <div class="grid gap-1.5">
          <label :for="`${uid}-name`" class="text-label text-foreground">{{ t.notebookName }}</label>
          <NqInput :id="`${uid}-name`" v-model="name" autofocus :placeholder="t.notebookNamePlaceholder" />
        </div>
        <div v-if="creating && parents.length" class="grid gap-1.5">
          <label :for="`${uid}-parent`" class="text-label text-foreground">{{ t.notebookParent }}</label>
          <select
            :id="`${uid}-parent`"
            :value="parentId ?? ''"
            class="h-control rounded-control border border-border bg-card px-2 text-body-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            @change="parentId = ($event.target as HTMLSelectElement).value || null"
          >
            <option value="">{{ t.notebookRoot }}</option>
            <option v-for="p in parents" :key="p.notebook.id" :value="p.notebook.id">{{ `${"— ".repeat(p.depth)}${p.notebook.name}` }}</option>
          </select>
        </div>
        <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" @click="emit('close')">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy" :disabled="!name.trim()">{{ creating ? t.create : t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
