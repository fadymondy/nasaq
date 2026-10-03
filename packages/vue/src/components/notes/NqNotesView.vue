<script setup lang="ts">
import { ArrowDownUp, Download, FolderPlus, LayoutGrid, List, Lock, LockOpen, Pencil, Pin, Plus, Search, Trash2, X } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions } from "../context-menu";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuLabel, NqDropdownMenuRadioGroup, NqDropdownMenuRadioItem, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqExportDialog } from "../export-action";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { formatRelativeTime, useFormatNumber } from "../numeric";
import { NqEmptyState, NqErrorState, NqLoadingState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqNoteActionsMenu from "./NqNoteActionsMenu.vue";
import NqNoteDialogs from "./NqNoteDialogs.vue";
import NqNotebookDialog, { type NotebookDialogState } from "./NqNotebookDialog.vue";
import NqNotesScopeBar from "./NqNotesScopeBar.vue";
import { noteTint } from "./note-tint";
import { bodyText, filterNotes, groupNotes, notebookPath, notebookScope, scopeCounts, snippetOf, sortNotes, type Note, type NoteGroupKind, type NoteSort, type NoteViewMode } from "./notes-model";
import { useNotesLabels } from "./strings";
import { resultError, useNoteMenu, type NoteAction, type NoteCreateResult, type NoteMenuApi, type NoteMenuOptions, type NoteResult } from "./use-note-menu";

// The notes list: search, sort, a list or coloured-board view, pinned and date sections, notebook and tag filters and a context menu
// plus a "…" menu on every note. It stores nothing: pass `notes` and update them from the callbacks.
interface Props extends NoteMenuOptions {
  notes: readonly Note[];
  /** The open note, marked in the list. */
  activeId?: string | null;
  /** "New note". Return `{ id }` to open it, or `{ error }` to report a failure. */
  onCreate?: () => Promise<NoteCreateResult> | void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  /** Show the chips row of notebooks, tags and filters above the list. Default true. */
  showScopeBar?: boolean;
  scopeBarClass?: HTMLAttributes["class"];
  onNotebookCreate?: (name: string, parentId: string | null) => Promise<NoteResult>;
  onNotebookRename?: (id: string, name: string) => Promise<NoteResult>;
  onNotebookDelete?: (id: string) => Promise<NoteResult>;
  /** Share one menu (and its dialogs) with a sibling NqNoteEditor, as NqNotes does. */
  menu?: NoteMenuApi;
  /** Reference time for "Today" and relative dates. Default now. */
  now?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { activeId: null, showScopeBar: true });
const emit = defineEmits<{ open: [id: string] }>();
// Each of these is controlled with v-model:name, or kept here when the parent does not bind it.
const scope = defineModel<string>("scope", { default: "all" });
const query = defineModel<string>("query", { default: "" });
const sort = defineModel<NoteSort>("sort", { default: "updated" });
const view = defineModel<NoteViewMode>("view", { default: "list" });

const { t, locale } = useNotesLabels(() => props.labels);
const fmt = useFormatNumber();
const own = useNoteMenu(() => props);
const menu = computed(() => props.menu ?? own);
const creating = ref(false);
const createError = ref<string | null>(null);
const exporting = ref(false);
const notebookDialog = ref<NotebookDialogState | null>(null);

const notebooks = computed(() => props.notebooks ?? []);
const unlocked = computed(() => props.unlocked ?? []);
const counts = computed(() => scopeCounts(props.notes, notebooks.value));
const shown = computed(() =>
  sortNotes(filterNotes(props.notes, { scope: scope.value, query: query.value, notebooks: notebooks.value, unlocked: unlocked.value }), sort.value, { locale: locale.value, pinnedFirst: scope.value !== "archive" }),
);
const groups = computed(() => groupNotes(shown.value, sort.value, props.now));
const currentNotebook = computed(() => (scope.value.startsWith("nb:") ? notebooks.value.find((n) => n.id === scope.value.slice(3)) : undefined));
const SORTS: NoteSort[] = ["updated", "created", "title"];

async function create() {
  if (!props.onCreate || creating.value) return;
  creating.value = true;
  createError.value = null;
  try {
    const result = await props.onCreate();
    const message = resultError(result);
    if (message) createError.value = message;
    else if (result && result.id) emit("open", result.id);
  } catch {
    createError.value = t.value.failed;
  } finally {
    creating.value = false;
  }
}

const listActions = computed<NoteAction[]>(() => [
  ...(props.onNotebookCreate ? [{ id: "new-notebook", label: t.value.newNotebook, icon: FolderPlus, onSelect: () => (notebookDialog.value = { kind: "create", parentId: currentNotebook.value?.id ?? null }), group: "notebooks" }] : []),
  ...(currentNotebook.value && props.onNotebookRename ? [{ id: "rename-notebook", label: t.value.renameNotebook, icon: Pencil, onSelect: () => (notebookDialog.value = { kind: "rename", notebook: currentNotebook.value }), group: "notebooks" }] : []),
  ...(currentNotebook.value && props.onNotebookDelete ? [{ id: "delete-notebook", label: t.value.deleteNotebook, icon: Trash2, danger: true, onSelect: () => (notebookDialog.value = { kind: "delete", notebook: currentNotebook.value }), group: "danger" }] : []),
  { id: "export-all", label: t.value.exportAll, icon: Download, onSelect: () => (exporting.value = true), group: "export", disabled: !props.notes.length },
]);

const emptyState = computed(() => {
  const s = t.value;
  if (query.value.trim()) return { title: s.noMatches, hint: s.noMatchesHint, kind: "search" };
  if (scope.value === "archive") return { title: s.emptyArchive, hint: s.emptyArchiveHint, kind: "" };
  if (scope.value === "sealed") return { title: s.emptySealed, hint: s.emptySealedHint, kind: "" };
  if (scope.value === "pinned") return { title: s.emptyPinned, hint: s.emptyPinnedHint, kind: "" };
  return { title: s.empty, hint: s.emptyHint, kind: "new" };
});

function onRowKey(event: KeyboardEvent, note: Note) {
  const el = event.currentTarget as HTMLElement;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    const items = [...(el.closest("ul")?.querySelectorAll<HTMLElement>("[data-slot=note-open]") ?? [])];
    const next = items[items.indexOf(el) + (event.key === "ArrowDown" ? 1 : -1)];
    if (next) {
      next.focus();
      event.preventDefault();
    }
  } else if (event.key === "Delete" && !event.shiftKey && menu.value.actionsFor(note).some((a) => a.id === "delete")) {
    event.preventDefault();
    menu.value.openDialog("delete", note);
  }
}

const open = (id: string) => emit("open", id);
const actionsOf = (note: Note) => menu.value.actionsFor(note, { onOpen: open });
const titleOf = (note: Note) => note.title.trim() || t.value.untitled;
const whenOf = (ms: number) => formatRelativeTime(ms, locale.value, { now: props.now });
const pathOf = (note: Note) => notebookPath(notebooks.value, note.notebookId);
const snippetFor = (note: Note) => snippetOf(note, view.value === "grid" ? 260 : 140);
const groupLabel = (kind: NoteGroupKind) => t.value.groups[kind];

const exportColumns = computed(() => {
  const x = t.value.exportColumns;
  return [
    { id: "title", label: x.title },
    { id: "notebook", label: x.notebook, value: (n: Note) => notebookPath(notebooks.value, n.notebookId).join(" / ") },
    { id: "tags", label: x.tags, value: (n: Note) => (n.tags ?? []).join(", ") },
    { id: "pinned", label: x.pinned, value: (n: Note) => (n.pinned ? "1" : "0") },
    { id: "created", label: x.created, value: (n: Note) => new Date(n.createdAt).toISOString() },
    { id: "updated", label: x.updated, value: (n: Note) => new Date(n.updatedAt).toISOString() },
    { id: "text", label: x.text, value: (n: Note) => (n.sealed && !unlocked.value.includes(n.id) ? "" : bodyText(n)) },
  ];
});

async function deleteNotebook(id: string) {
  const result = await props.onNotebookDelete?.(id);
  if (!resultError(result)) {
    notebookDialog.value = null;
    if (scope.value === notebookScope(id)) scope.value = "all";
  }
  return result;
}
</script>

<template>
  <section data-slot="notes-view" :data-view="view" :aria-label="t.notes" :class="cn('flex min-h-0 min-w-0 flex-col', props.class)">
    <div class="flex flex-col gap-2 border-b border-border p-3">
      <NqInputGroup>
        <NqInputGroupAddon><Search aria-hidden="true" class="size-4 text-muted-foreground" /></NqInputGroupAddon>
        <NqInputGroupInput v-model="query" data-slot="notes-search" type="search" :placeholder="t.searchPlaceholder" :aria-label="t.search" />
        <NqInputGroupAddon v-if="query" align="end">
          <NqButton variant="ghost" size="icon-sm" :aria-label="t.clearSearch" @click="query = ''"><X aria-hidden="true" /></NqButton>
        </NqInputGroupAddon>
      </NqInputGroup>
      <div class="flex flex-wrap items-center gap-2">
        <NqButton v-if="props.onCreate" variant="primary" size="sm" :loading="creating" data-slot="notes-new" @click="create">
          <Plus aria-hidden="true" />
          {{ t.newNote }}
        </NqButton>
        <span class="ms-auto" />
        <NqDropdownMenu>
          <NqDropdownMenuTrigger as-child>
            <NqButton variant="ghost" size="icon-sm" :aria-label="`${t.sortBy}: ${t.sort[sort]}`" class="text-muted-foreground"><ArrowDownUp aria-hidden="true" /></NqButton>
          </NqDropdownMenuTrigger>
          <NqDropdownMenuContent align="end">
            <NqDropdownMenuGroup>
              <NqDropdownMenuLabel>{{ t.sortBy }}</NqDropdownMenuLabel>
              <NqDropdownMenuRadioGroup :model-value="sort" @update:model-value="(v: string) => (sort = v as NoteSort)">
                <NqDropdownMenuRadioItem v-for="s in SORTS" :key="s" :value="s">{{ t.sort[s] }}</NqDropdownMenuRadioItem>
              </NqDropdownMenuRadioGroup>
            </NqDropdownMenuGroup>
          </NqDropdownMenuContent>
        </NqDropdownMenu>
        <NqToggleGroup :model-value="[view]" :aria-label="t.viewMode" @update:model-value="(v: string[]) => v[0] && (view = v[0] as NoteViewMode)">
          <NqToggle value="list" :aria-label="t.viewList"><List aria-hidden="true" /></NqToggle>
          <NqToggle value="grid" :aria-label="t.viewGrid"><LayoutGrid aria-hidden="true" /></NqToggle>
        </NqToggleGroup>
        <NqNoteActionsMenu :actions="listActions" :label="t.listActions" />
      </div>
      <p v-if="createError" role="alert" class="text-body-sm text-nq-danger-text">{{ createError }}</p>
    </div>

    <NqNotesScopeBar v-if="props.showScopeBar" v-model:scope="scope" :notes="props.notes" :notebooks="notebooks" :counts="counts" :labels="props.labels" :class="props.scopeBarClass" />

    <div data-slot="notes-list" class="min-h-0 flex-1 overflow-y-auto p-2">
      <NqLoadingState v-if="props.loading" :label="t.loading" :rows="5" />
      <NqErrorState v-else-if="props.error" :title="t.failed" :description="props.error">
        <template v-if="props.onRetry" #actions><NqButton variant="secondary" size="sm" @click="props.onRetry">{{ t.retry }}</NqButton></template>
      </NqErrorState>
      <NqEmptyState v-else-if="!shown.length" :title="emptyState.title" :description="emptyState.hint">
        <template v-if="emptyState.kind === 'search'" #actions><NqButton variant="secondary" size="sm" @click="query = ''">{{ t.clearSearch }}</NqButton></template>
        <template v-else-if="emptyState.kind === 'new' && props.onCreate" #actions>
          <NqButton variant="primary" size="sm" @click="create"><Plus aria-hidden="true" />{{ t.newNote }}</NqButton>
        </template>
      </NqEmptyState>
      <template v-else>
        <div v-for="group in groups" :key="group.kind" data-slot="note-group" :data-group="group.kind" class="flex flex-col gap-1">
          <h3 v-if="group.kind !== 'all'" class="flex items-center gap-1.5 px-3 pb-1 pt-3 text-caption font-medium uppercase text-muted-foreground">
            <Pin v-if="group.kind === 'pinned'" aria-hidden="true" class="size-3" />
            {{ groupLabel(group.kind) }}
            <span class="font-normal">{{ fmt(group.notes.length) }}</span>
          </h3>
          <ul role="list" :aria-label="groupLabel(group.kind)" :class="cn(view === 'grid' ? 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.5rem),1fr))] gap-2.5 px-1' : 'flex flex-col gap-0.5')">
            <template v-for="note in group.notes" :key="note.id">
              <!-- board card -->
              <NqContextMenuActions
                v-if="view === 'grid'"
                as="li"
                :actions="actionsOf(note)"
                data-slot="note-card"
                :data-active="note.id === props.activeId ? '' : undefined"
                :data-color="note.color ?? undefined"
                :style="noteTint(note.color)"
                class="group/note relative flex min-h-32 min-w-0 flex-col rounded-card border border-border bg-card transition-shadow duration-150 ease-nq hover:shadow-sm data-active:outline-2 data-active:outline-nq-focus"
              >
                <button
                  type="button"
                  data-slot="note-open"
                  :aria-current="note.id === props.activeId ? 'true' : undefined"
                  class="flex min-w-0 flex-1 flex-col gap-2 rounded-card p-3 text-start focus-visible:outline-2 focus-visible:outline-nq-focus"
                  @click="open(note.id)"
                  @keydown="onRowKey($event, note)"
                >
                  <span class="flex min-w-0 items-center gap-1.5 pe-8">
                    <template v-if="note.sealed">
                      <Lock v-if="menu.isLocked(note)" :aria-label="t.sealedNote" class="size-3.5 shrink-0 text-muted-foreground" />
                      <LockOpen v-else :aria-label="t.unlockedBanner" class="size-3.5 shrink-0 text-muted-foreground" />
                    </template>
                    <Pin v-if="note.pinned" :aria-label="t.pinnedBadge" class="size-3.5 shrink-0 text-muted-foreground" />
                    <span dir="auto" class="min-w-0 flex-1 truncate text-label text-foreground">{{ titleOf(note) }}</span>
                  </span>
                  <span dir="auto">
                    <span v-if="menu.isLocked(note)" class="flex items-center gap-1.5 text-body-sm text-muted-foreground"><Lock aria-hidden="true" class="size-3.5" />{{ t.sealedHint }}</span>
                    <span v-else class="line-clamp-6 text-body-sm text-muted-foreground">{{ snippetFor(note) }}</span>
                  </span>
                  <span class="mt-auto flex min-w-0 flex-col gap-1.5 pt-1">
                    <span class="flex min-w-0 flex-wrap items-center gap-1">
                      <NqBadge v-if="pathOf(note).length" variant="outline" class="max-w-full"><span class="truncate">{{ pathOf(note).join(" / ") }}</span></NqBadge>
                      <NqBadge v-for="tag in (note.tags ?? []).slice(0, 3)" :key="tag" variant="neutral" class="max-w-32"><span class="truncate">{{ tag }}</span></NqBadge>
                    </span>
                    <span class="text-caption text-muted-foreground">{{ whenOf(note.updatedAt) }}</span>
                  </span>
                </button>
                <NqNoteActionsMenu
                  :actions="actionsOf(note)"
                  :label="t.actionsFor(titleOf(note))"
                  class="absolute end-1.5 top-1.5 opacity-0 transition-opacity group-hover/note:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"
                />
              </NqContextMenuActions>
              <!-- list row -->
              <NqContextMenuActions
                v-else
                as="li"
                :actions="actionsOf(note)"
                data-slot="note-row"
                :data-active="note.id === props.activeId ? '' : undefined"
                :data-color="note.color ?? undefined"
                class="group/note relative rounded-control border-s-[3px] border-transparent hover:bg-nq-hover data-active:bg-nq-selected"
                :style="note.color ? { borderInlineStartColor: `var(--nq-tag-${note.color})` } : undefined"
              >
                <button
                  type="button"
                  data-slot="note-open"
                  :aria-current="note.id === props.activeId ? 'true' : undefined"
                  class="flex w-full min-w-0 flex-col gap-1 rounded-control px-3 py-2.5 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
                  @click="open(note.id)"
                  @keydown="onRowKey($event, note)"
                >
                  <span class="flex min-w-0 items-center gap-1.5 pe-8">
                    <template v-if="note.sealed">
                      <Lock v-if="menu.isLocked(note)" :aria-label="t.sealedNote" class="size-3.5 shrink-0 text-muted-foreground" />
                      <LockOpen v-else :aria-label="t.unlockedBanner" class="size-3.5 shrink-0 text-muted-foreground" />
                    </template>
                    <Pin v-if="note.pinned" :aria-label="t.pinnedBadge" class="size-3.5 shrink-0 text-muted-foreground" />
                    <span dir="auto" class="min-w-0 flex-1 truncate text-label text-foreground">{{ titleOf(note) }}</span>
                    <span class="shrink-0 text-caption text-muted-foreground">{{ whenOf(note.updatedAt) }}</span>
                  </span>
                  <span dir="auto">
                    <span v-if="menu.isLocked(note)" class="flex items-center gap-1.5 text-body-sm text-muted-foreground"><Lock aria-hidden="true" class="size-3.5" />{{ t.sealedHint }}</span>
                    <span v-else class="line-clamp-2 text-body-sm text-muted-foreground">{{ snippetFor(note) }}</span>
                  </span>
                  <span v-if="pathOf(note).length || note.tags?.length" class="flex min-w-0 flex-wrap items-center gap-1">
                    <NqBadge v-if="pathOf(note).length" variant="outline" class="max-w-full"><span class="truncate">{{ pathOf(note).join(" / ") }}</span></NqBadge>
                    <NqBadge v-for="tag in (note.tags ?? []).slice(0, 3)" :key="tag" variant="neutral" class="max-w-32"><span class="truncate">{{ tag }}</span></NqBadge>
                  </span>
                </button>
                <NqNoteActionsMenu
                  :actions="actionsOf(note)"
                  :label="t.actionsFor(titleOf(note))"
                  class="absolute end-1.5 top-1.5 opacity-0 transition-opacity group-hover/note:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"
                />
              </NqContextMenuActions>
            </template>
          </ul>
        </div>
      </template>
    </div>

    <NqNoteDialogs v-if="!props.menu" :menu="own" />
    <NqExportDialog
      v-if="exporting"
      :open="true"
      filename="notes"
      :formats="['csv', 'xlsx', 'json']"
      :columns="exportColumns"
      :scopes="{ filtered: shown as Note[], all: props.notes as Note[] }"
      default-scope="filtered"
      @update:open="(o: boolean) => !o && (exporting = false)"
    />
    <NqNotebookDialog
      v-if="notebookDialog"
      :key="`${notebookDialog.kind}-${notebookDialog.notebook?.id ?? ''}`"
      :state="notebookDialog"
      :notebooks="notebooks"
      :on-create="props.onNotebookCreate"
      :on-rename="props.onNotebookRename"
      :on-delete="deleteNotebook"
      :labels="props.labels"
      @close="notebookDialog = null"
    />
  </section>
</template>
