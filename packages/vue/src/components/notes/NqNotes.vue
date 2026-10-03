<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { isApplePlatform } from "../commands";
import NqNoteDialogs from "./NqNoteDialogs.vue";
import NqNoteEditor from "./NqNoteEditor.vue";
import NqNotebookDialog, { type NotebookDialogState } from "./NqNotebookDialog.vue";
import NqNotesSidebar from "./NqNotesSidebar.vue";
import NqNotesView from "./NqNotesView.vue";
import { matchNoteShortcut, notebookScope, type Note, type NoteSort, type NoteViewMode } from "./notes-model";
import { resultError, useNoteMenu, type NoteCreateResult, type NoteMenuOptions, type NoteResult } from "./use-note-menu";

// The notes workspace: notebooks and filters, the list or board, and the editor, with the keyboard shortcuts
// (Ctrl+N or Alt+N new, Mod+Shift+P pin, A archive, D duplicate, L seal, F search, Alt+M actions). Wide: three columns.
// Medium: list and editor. Narrow: the list and the editor swap. In board view the editor replaces the board.
// It keeps which sealed notes are open for the session and nothing else: the notes live in your state or server.
interface Props extends Omit<NoteMenuOptions, "unlocked" | "onLock"> {
  notes: readonly Note[];
  /** The open note (controlled). */
  activeId?: string | null;
  defaultActiveId?: string | null;
  /** Make a note and return its id, so it opens. Resolve `{ error }` to report a failure. */
  onCreate?: () => Promise<NoteCreateResult>;
  /** Check a sealed note's password. Resolve `{ error }` for a wrong one; on success the note opens for this session. */
  onUnlock?: (id: string, password: string) => Promise<NoteResult>;
  onNotebookCreate?: (name: string, parentId: string | null) => Promise<NoteResult>;
  onNotebookRename?: (id: string, name: string) => Promise<NoteResult>;
  onNotebookDelete?: (id: string) => Promise<NoteResult>;
  defaultScope?: string;
  defaultSort?: NoteSort;
  defaultView?: NoteViewMode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  autosaveDelay?: number;
  /** Loads Tiptap for rich notes: `() => import("./tiptap")`. */
  load?: () => Promise<any>;
  now?: number;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ activeChange: [id: string | null] }>();

const activeState = ref<string | null>(props.defaultActiveId ?? null);
const activeRaw = computed(() => (props.activeId !== undefined ? props.activeId : activeState.value));
function setActive(id: string | null) {
  if (props.activeId === undefined) activeState.value = id;
  emit("activeChange", id);
}
const active = computed(() => props.notes.find((n) => n.id === activeRaw.value) ?? null);
const unlocked = ref<string[]>([]);
const scope = ref(props.defaultScope ?? "all");
const query = ref("");
const sort = ref<NoteSort>(props.defaultSort ?? "updated");
const view = ref<NoteViewMode>(props.defaultView ?? "list");
const notebookDialog = ref<NotebookDialogState | null>(null);
const root = ref<HTMLElement | null>(null);

const lock = (id: string) => (unlocked.value = unlocked.value.filter((x) => x !== id));
const unlockId = (id: string) => (unlocked.value = unlocked.value.includes(id) ? unlocked.value : [...unlocked.value, id]);
const options = computed<NoteMenuOptions>(() => ({
  ...props,
  unlocked: unlocked.value,
  onLock: lock,
  onDelete: props.onDelete
    ? async (id) => {
        const result = await props.onDelete!(id);
        if (!resultError(result) && id === active.value?.id) setActive(null);
        return result;
      }
    : undefined,
  onSeal: props.onSeal
    ? async (id, password) => {
        const result = await props.onSeal!(id, password);
        if (!resultError(result)) unlockId(id);
        return result;
      }
    : undefined,
  onRemoveSeal: props.onRemoveSeal
    ? async (id, password) => {
        const result = await props.onRemoveSeal!(id, password);
        if (!resultError(result)) lock(id);
        return result;
      }
    : undefined,
}));
const menu = useNoteMenu(() => options.value);

async function create(): Promise<NoteCreateResult> {
  const result = await props.onCreate?.();
  if (result && result.id) {
    setActive(result.id);
    if (scope.value === "archive" || scope.value === "sealed") scope.value = "all";
  }
  return result;
}
async function unlock(id: string, password: string) {
  const result = await props.onUnlock?.(id, password);
  if (!resultError(result)) unlockId(id);
  return result;
}

function onKeyDown(event: KeyboardEvent) {
  const shortcut = matchNoteShortcut(event, isApplePlatform());
  if (!shortcut) return;
  if (shortcut === "new") {
    if (!props.onCreate) return;
    event.preventDefault();
    void create();
  } else if (shortcut === "search") {
    event.preventDefault();
    const el = root.value?.querySelector<HTMLElement>("[data-slot=notes-search]");
    (el instanceof HTMLInputElement ? el : el?.querySelector("input"))?.focus();
  } else if (shortcut === "actions") {
    const trigger = root.value?.querySelector<HTMLElement>("[data-slot=note-editor-body] [data-slot=note-actions-trigger]");
    if (trigger) {
      event.preventDefault();
      trigger.click();
    }
  } else if (active.value) {
    if (menu.runShortcut(active.value, shortcut)) event.preventDefault();
  }
}

const showEditor = computed(() => active.value !== null);
const boardMode = computed(() => view.value === "grid");
const listClass = computed(() =>
  boardMode.value
    ? showEditor.value ? "hidden" : "flex flex-1"
    : showEditor.value
      ? "hidden @2xl:flex @2xl:w-80 @4xl:w-96 @2xl:shrink-0 @2xl:border-e @2xl:border-border"
      : "flex flex-1 @2xl:w-80 @2xl:flex-none @4xl:w-96 @2xl:shrink-0 @2xl:border-e @2xl:border-border",
);
const editorClass = computed(() => (boardMode.value ? (showEditor.value ? "flex" : "hidden") : showEditor.value ? "flex" : "hidden @2xl:flex"));
const notebooks = computed(() => props.notebooks ?? []);

async function dialogCreate(name: string, parentId: string | null) {
  const result = await props.onNotebookCreate?.(name, parentId);
  if (!resultError(result)) notebookDialog.value = null;
  return result;
}
async function dialogRename(id: string, name: string) {
  const result = await props.onNotebookRename?.(id, name);
  if (!resultError(result)) notebookDialog.value = null;
  return result;
}
async function dialogDelete(id: string) {
  const result = await props.onNotebookDelete?.(id);
  if (!resultError(result)) {
    notebookDialog.value = null;
    if (scope.value === notebookScope(id)) scope.value = "all";
  }
  return result;
}
</script>

<template>
  <div ref="root" data-slot="notes" :data-view="view" :class="cn('@container flex h-full min-h-0 w-full min-w-0 bg-background', props.class)" @keydown="onKeyDown">
    <NqNotesSidebar
      class="hidden @4xl:flex"
      :notes="props.notes"
      :notebooks="notebooks"
      :scope="scope"
      :labels="props.labels"
      :on-notebook-create="props.onNotebookCreate ? (parentId: string | null) => (notebookDialog = { kind: 'create', parentId }) : undefined"
      :on-notebook-rename="props.onNotebookRename ? (notebook) => (notebookDialog = { kind: 'rename', notebook }) : undefined"
      :on-notebook-delete="props.onNotebookDelete ? (notebook) => (notebookDialog = { kind: 'delete', notebook }) : undefined"
      @update:scope="(s: string) => (scope = s)"
    />
    <NqNotesView
      v-bind="{ ...options, notes: props.notes, loading: props.loading, error: props.error, onRetry: props.onRetry, now: props.now }"
      :menu="menu"
      :active-id="active?.id ?? null"
      :on-create="props.onCreate ? create : undefined"
      v-model:scope="scope"
      v-model:query="query"
      v-model:sort="sort"
      v-model:view="view"
      scope-bar-class="@4xl:hidden"
      :class="listClass"
      @open="setActive"
    />
    <NqNoteEditor
      v-bind="{ ...options, now: props.now }"
      :menu="menu"
      :note="active"
      :autosave-delay="props.autosaveDelay"
      :load="props.load"
      :on-back="() => setActive(null)"
      :back-class="boardMode ? undefined : '@2xl:hidden'"
      :on-open-note="setActive"
      :on-unlock="props.onUnlock ? unlock : undefined"
      :class="editorClass"
    />
    <NqNoteDialogs :menu="menu" />
    <NqNotebookDialog
      v-if="notebookDialog"
      :key="`${notebookDialog.kind}-${notebookDialog.notebook?.id ?? ''}`"
      :state="notebookDialog"
      :notebooks="notebooks"
      :on-create="dialogCreate"
      :on-rename="dialogRename"
      :on-delete="dialogDelete"
      :labels="props.labels"
      @close="notebookDialog = null"
    />
  </div>
</template>
