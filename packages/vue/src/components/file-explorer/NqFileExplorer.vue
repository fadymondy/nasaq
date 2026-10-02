<script setup lang="ts">
import { Download, Folder, FolderOpen, FolderPlus, LayoutGrid, List, Search, Trash2, Upload } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBreadcrumb, NqBreadcrumbItem, NqBreadcrumbLink, NqBreadcrumbList, NqBreadcrumbPage, NqBreadcrumbSeparator } from "../breadcrumb";
import { NqButton } from "../button";
import { NqContextMenuActions } from "../context-menu";
import { NqDataTable, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { formatFileSize, NqUploadList, type UploadFile } from "../file-upload";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { NqDateTime } from "../numeric";
import { NqEmptyState, NqLoadingState } from "../states";
import { NqTreeView, type TreeNode } from "../tree-view";
import { fileKind, findNode, findPath, sortNodes } from "./file-format";
import NqFileExplorerDelete from "./NqFileExplorerDelete.vue";
import NqFileExplorerNewFolder from "./NqFileExplorerNewFolder.vue";
import NqFileExplorerPreview from "./NqFileExplorerPreview.vue";
import NqFileKindIcon from "./NqFileKindIcon.vue";
import { FILE_EXPLORER_STRINGS, type FileExplorerLabels } from "./strings";
import type { FileExplorerView, FileNode, FileResult } from "./types";

// A file browser: a folder tree, breadcrumbs, a sortable list or a grid, a preview pane, upload by button or drop,
// new folder and delete. It has no storage: your callbacks do the work and you pass back the updated `nodes`.
// Rows (list) and tiles (grid) open Download and Delete as a context menu too.
const props = withDefaults(
  defineProps<{
    /** The top-level items. Folders carry their `children`. */
    nodes: readonly FileNode[];
    /** Name of the root shown in the tree and breadcrumbs. Default "All files". */
    rootLabel?: string;
    /** The open folder id (v-model:folderId). `null` is the root. */
    folderId?: string | null;
    defaultFolderId?: string | null;
    /** The selected file id (v-model:selectedId). */
    selectedId?: string | null;
    /** The layout (v-model:view). */
    view?: FileExplorerView;
    defaultView?: FileExplorerView;
    /** Files chosen or dropped. `folderId` is the open folder (`null` at the root). Shows the Upload button and the dropzone. */
    onUpload?: (files: File[], folderId: string | null) => Promise<FileResult>;
    /** Upload progress to show above the list. Your `onUpload` keeps it up to date, like `NqFileUpload`. */
    uploads?: readonly UploadFile[];
    /** Create a folder inside `parentId`. Shows New folder. Resolve `{ error }` to keep the dialog open. */
    onCreateFolder?: (name: string, parentId: string | null) => Promise<FileResult>;
    /** Delete a file or folder after a confirm. Shows Delete. */
    onDelete?: (node: FileNode) => Promise<FileResult>;
    /** Shows Download in the preview and the row menu. */
    onDownload?: (node: FileNode) => void;
    /** Open the row menu (Download, Delete) as a context menu on context-click, long-press or Shift+F10, in list and grid. Default true. */
    contextMenu?: boolean;
    loading?: boolean;
    /** The region label. */
    title?: string;
    labels?: Partial<FileExplorerLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    rootLabel: undefined,
    folderId: undefined,
    defaultFolderId: null,
    selectedId: undefined,
    view: undefined,
    defaultView: "list",
    onUpload: undefined,
    uploads: () => [],
    onCreateFolder: undefined,
    onDelete: undefined,
    onDownload: undefined,
    contextMenu: true,
    loading: false,
    title: undefined,
    labels: undefined,
  },
);
const emit = defineEmits<{
  "update:folderId": [id: string | null];
  "update:selectedId": [id: string | null];
  "update:view": [view: FileExplorerView];
  removeUpload: [item: UploadFile];
  retryUpload: [item: UploadFile];
}>();

const ROOT = "\u0000root";
const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed<FileExplorerLabels>(() => ({ ...(FILE_EXPLORER_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"] as FileExplorerLabels), ...props.labels }));
const root = computed(() => props.rootLabel ?? t.value.root);

const innerFolder = ref<string | null>(props.defaultFolderId);
const innerSelected = ref<string | null>(null);
const innerView = ref<FileExplorerView>(props.defaultView);
const folderId = computed(() => (props.folderId !== undefined ? props.folderId : innerFolder.value));
const selectedId = computed(() => (props.selectedId !== undefined ? props.selectedId : innerSelected.value));
const view = computed(() => props.view ?? innerView.value);
function setFolder(id: string | null) {
  innerFolder.value = id;
  emit("update:folderId", id);
}
function setSelected(id: string | null) {
  innerSelected.value = id;
  emit("update:selectedId", id);
}
function setView(next: FileExplorerView) {
  innerView.value = next;
  emit("update:view", next);
}

const query = ref("");
const dragging = ref(false);
const creating = ref(false);
const deleting = ref<FileNode | null>(null);
const error = ref<string | null>(null);
const uploading = ref(false);
const input = ref<HTMLInputElement | null>(null);
let dragDepth = 0;

const trail = computed(() => (folderId.value ? (findPath(props.nodes, folderId.value) ?? []) : []));
const current = computed(() => trail.value[trail.value.length - 1] ?? null);
const currentFolderId = computed(() => (current.value ? current.value.id : null));
const contents = computed<readonly FileNode[]>(() => (current.value ? (current.value.children ?? []) : props.nodes));
const shown = computed(() => {
  const q = query.value.trim().toLowerCase();
  return sortNodes(q ? contents.value.filter((n) => n.name.toLowerCase().includes(q)) : contents.value, "name", "asc", locale.value);
});
const selected = computed(() => (selectedId.value ? findNode(props.nodes, selectedId.value) : null));
const selectedFile = computed(() => (selected.value && selected.value.kind === "file" ? selected.value : null));

function folderTree(nodes: readonly FileNode[]): TreeNode[] {
  return nodes
    .filter((n) => n.kind === "folder")
    .map((n) => {
      const sub = folderTree(n.children ?? []);
      return { id: n.id, textValue: n.name, icon: Folder, label: () => h("bdi", { dir: "auto" }, n.name), ...(sub.length ? { children: sub } : {}) };
    });
}
const tree = computed<TreeNode[]>(() => [{ id: ROOT, textValue: root.value, icon: FolderOpen, label: () => h("bdi", { dir: "auto" }, root.value), children: folderTree(props.nodes) }]);
const expanded = computed(() => [ROOT, ...trail.value.map((n) => n.id)]);
const crumbs = computed(() => [{ id: null as string | null, name: root.value }, ...trail.value.map((n) => ({ id: n.id as string | null, name: n.name }))]);

function open(id: string | null) {
  setFolder(id);
  setSelected(null);
  query.value = "";
}
function activate(node: FileNode) {
  if (node.kind === "folder") open(node.id);
  else setSelected(node.id);
}
function onTreeSelect(ids: string[]) {
  const id = ids[ids.length - 1];
  if (id) open(id === ROOT ? null : id);
}

async function send(files: File[]) {
  if (!props.onUpload || files.length === 0) return;
  uploading.value = true;
  error.value = null;
  try {
    const result = await props.onUpload(files, currentFolderId.value);
    if (result?.error) error.value = result.error;
  } catch {
    error.value = t.value.genericError;
  } finally {
    uploading.value = false;
  }
}
function onPick(event: Event) {
  const el = event.target as HTMLInputElement;
  const files = [...(el.files ?? [])];
  el.value = "";
  void send(files);
}
const hasFiles = (e: DragEvent) => Boolean(e.dataTransfer?.types.includes("Files"));
const dragListeners = {
  dragenter(e: DragEvent) {
    if (!hasFiles(e)) return;
    dragDepth += 1;
    dragging.value = true;
  },
  dragover(e: DragEvent) {
    if (hasFiles(e)) e.preventDefault();
  },
  dragleave() {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dragging.value = false;
  },
  drop(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    dragging.value = false;
    void send([...(e.dataTransfer?.files ?? [])]);
  },
};

const columns = computed<DataTableColumn<FileNode>[]>(() => {
  const tt = t.value;
  const loc = locale.value;
  return [
    {
      id: "name",
      header: tt.name,
      label: tt.name,
      hideable: false,
      cell: (n) =>
        h("span", { class: "flex min-w-0 items-center gap-2" }, [
          h(NqFileKindIcon, { kind: fileKind(n), class: "size-4.5" }),
          h("bdi", { dir: "auto", class: "truncate text-foreground" }, n.name),
        ]),
      sortValue: (n) => `${n.kind === "folder" ? "0" : "1"}${n.name.toLowerCase()}`,
      searchValue: (n) => n.name,
    },
    {
      id: "modified",
      header: tt.modified,
      label: tt.modified,
      cell: (n) => (n.modifiedAt ? h(NqDateTime, { value: n.modifiedAt, format: { dateStyle: "medium" }, class: "text-muted-foreground" }) : h("span", { class: "text-muted-foreground" }, "-")),
      sortValue: (n) => (n.modifiedAt ? new Date(n.modifiedAt) : null),
      className: "hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
    },
    {
      id: "size",
      header: tt.size,
      label: tt.size,
      align: "end",
      cell: (n) =>
        n.kind === "folder"
          ? h("span", { class: "text-muted-foreground" }, tt.items((n.children ?? []).length))
          : n.size !== undefined
            ? h("span", { class: "text-muted-foreground" }, h("bdi", { dir: "ltr" }, formatFileSize(n.size, loc)))
            : "-",
      sortValue: (n) => (n.kind === "folder" ? (n.children ?? []).length : (n.size ?? null)),
    },
  ];
});
const table = useDataTable<FileNode>({ data: () => shown.value as FileNode[], columns, getRowId: (n) => n.id, defaultSort: { id: "name", direction: "asc" } });

function rowActions(n: FileNode): DataTableRowAction[] {
  const out: DataTableRowAction[] = [];
  if (props.onDownload && n.kind === "file") out.push({ id: "download", label: t.value.download, icon: Download, onSelect: () => props.onDownload?.(n) });
  if (props.onDelete) out.push({ id: "delete", label: t.value.remove, icon: Trash2, danger: true, onSelect: () => (deleting.value = n), group: "danger" });
  return out;
}
const hasActions = computed(() => Boolean(props.onDownload || props.onDelete));
const empty = computed(() => contents.value.length === 0);

async function confirmDelete(node: FileNode) {
  const result = await props.onDelete!(node);
  if (!result?.error && selectedId.value === node.id) setSelected(null);
  return result;
}
</script>

<template>
  <section
    data-slot="file-explorer"
    :aria-label="props.title ?? t.title"
    :class="cn('grid min-w-0 gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_18rem]', props.class)"
  >
    <aside :aria-label="t.folders" class="min-w-0 rounded-card border border-border bg-card p-2 max-lg:max-h-48 max-lg:overflow-y-auto lg:max-h-[36rem] lg:overflow-y-auto">
      <NqTreeView :aria-label="t.folders" :items="tree" :expanded="expanded" :selected="[folderId ?? ROOT]" @update:expanded="() => {}" @update:selected="onTreeSelect" />
    </aside>

    <div class="flex min-w-0 flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqBreadcrumb :aria-label="t.breadcrumb">
          <NqBreadcrumbList>
            <NqBreadcrumbItem v-for="(crumb, i) in crumbs" :key="crumb.id ?? ROOT">
              <NqBreadcrumbPage v-if="i === crumbs.length - 1"><bdi dir="auto">{{ crumb.name }}</bdi></NqBreadcrumbPage>
              <template v-else>
                <NqBreadcrumbLink href="#" @click.prevent="open(crumb.id)"><bdi dir="auto">{{ crumb.name }}</bdi></NqBreadcrumbLink>
                <NqBreadcrumbSeparator />
              </template>
            </NqBreadcrumbItem>
          </NqBreadcrumbList>
        </NqBreadcrumb>
        <div class="flex flex-wrap items-center gap-2">
          <NqButton v-if="props.onCreateFolder" type="button" size="sm" @click="creating = true">
            <FolderPlus aria-hidden="true" />
            {{ t.newFolder }}
          </NqButton>
          <template v-if="props.onUpload">
            <input ref="input" type="file" multiple class="sr-only" tabindex="-1" aria-hidden="true" @change="onPick" />
            <NqButton type="button" size="sm" variant="primary" :loading="uploading" @click="input?.click()">
              <Upload aria-hidden="true" />
              {{ t.upload }}
            </NqButton>
          </template>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <NqInputGroup class="min-w-0 max-w-sm flex-1">
          <NqInputGroupAddon align="start">
            <Search aria-hidden="true" class="size-4 text-muted-foreground" />
          </NqInputGroupAddon>
          <NqInputGroupInput v-model="query" type="search" :placeholder="t.search" :aria-label="t.search" />
        </NqInputGroup>
        <div role="group" :aria-label="t.view" class="ms-auto inline-flex rounded-control border border-border p-0.5">
          <NqButton type="button" size="icon-sm" :variant="view === 'list' ? 'secondary' : 'ghost'" :aria-pressed="view === 'list'" :aria-label="t.listView" :title="t.listView" @click="setView('list')">
            <List aria-hidden="true" />
          </NqButton>
          <NqButton type="button" size="icon-sm" :variant="view === 'grid' ? 'secondary' : 'ghost'" :aria-pressed="view === 'grid'" :aria-label="t.gridView" :title="t.gridView" @click="setView('grid')">
            <LayoutGrid aria-hidden="true" />
          </NqButton>
        </div>
      </div>

      <NqAlert v-if="error" tone="danger" role="alert" dismissible @dismiss="error = null">{{ error }}</NqAlert>
      <NqUploadList v-if="props.uploads.length" :items="props.uploads" @remove="emit('removeUpload', $event)" @retry="emit('retryUpload', $event)" />

      <div
        data-slot="file-explorer-listing"
        :data-dragging="dragging ? '' : undefined"
        :class="cn('relative min-w-0 rounded-card', dragging && 'outline-2 -outline-offset-2 outline-nq-focus outline-dashed')"
        v-on="props.onUpload ? dragListeners : {}"
      >
        <div v-if="dragging" class="absolute inset-0 z-10 flex items-center justify-center rounded-card bg-card/85 text-label text-foreground">
          <Upload aria-hidden="true" class="me-2 size-5" />
          {{ t.dropHere }}
        </div>
        <NqLoadingState v-if="props.loading" :label="t.loading" :rows="5" />
        <NqEmptyState v-else-if="empty" :icon="FolderOpen" :title="t.emptyTitle" :description="props.onUpload ? t.emptyBody : undefined">
          <template v-if="props.onUpload" #actions>
            <NqButton type="button" variant="primary" @click="input?.click()">
              <Upload aria-hidden="true" />
              {{ t.upload }}
            </NqButton>
          </template>
        </NqEmptyState>
        <p v-else-if="shown.length === 0" class="rounded-card border border-dashed border-border px-4 py-10 text-center text-body-sm text-muted-foreground">{{ t.noMatch }}</p>
        <NqDataTable
          v-else-if="view === 'list'"
          :table="table"
          :label="t.listLabel"
          :row-label="(n: FileNode) => n.name"
          :on-row-click="activate"
          :context-menu="props.contextMenu"
          :row-actions="hasActions ? rowActions : undefined"
        />
        <ul v-else :aria-label="t.gridLabel" class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
          <NqContextMenuActions v-for="n in shown" :key="n.id" as="li" :actions="hasActions ? rowActions(n) : []" :disabled="!props.contextMenu">
            <button
              type="button"
              :data-selected="n.id === selectedId ? '' : undefined"
              :aria-pressed="n.kind === 'file' ? n.id === selectedId : undefined"
              class="flex w-full flex-col items-stretch gap-2 rounded-card border border-border bg-card p-2 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-[selected]:border-nq-accent data-[selected]:bg-nq-selected"
              @click="activate(n)"
            >
              <span class="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-control bg-secondary">
                <img v-if="fileKind(n) === 'image' && n.previewUrl" :src="n.previewUrl" alt="" loading="lazy" class="size-full object-cover" />
                <NqFileKindIcon v-else :kind="fileKind(n)" class="size-10" />
              </span>
              <span class="flex min-w-0 flex-col">
                <bdi dir="auto" class="truncate text-body-sm text-foreground">{{ n.name }}</bdi>
                <span class="truncate text-caption text-muted-foreground">
                  <template v-if="n.kind === 'folder'">{{ t.items((n.children ?? []).length) }}</template>
                  <bdi v-else-if="n.size !== undefined" dir="ltr">{{ formatFileSize(n.size, locale) }}</bdi>
                  <template v-else>{{ t.kinds[fileKind(n)] }}</template>
                </span>
              </span>
            </button>
          </NqContextMenuActions>
        </ul>
      </div>
      <p class="text-caption text-muted-foreground">{{ t.items(contents.length) }}</p>
    </div>

    <aside :aria-label="t.preview" class="min-w-0 rounded-card border border-border bg-card p-3 max-xl:col-span-full lg:max-xl:col-start-2">
      <NqFileExplorerPreview
        v-if="selectedFile"
        :file="selectedFile"
        :trail="trail"
        :root="root"
        :t="t"
        :locale="locale"
        :can-download="Boolean(props.onDownload)"
        :can-delete="Boolean(props.onDelete)"
        @close="setSelected(null)"
        @download="props.onDownload?.(selectedFile)"
        @delete="deleting = selectedFile"
      />
      <p v-else class="px-2 py-6 text-center text-body-sm text-muted-foreground">{{ t.previewNone }}</p>
    </aside>

    <NqFileExplorerNewFolder
      v-if="creating && props.onCreateFolder"
      :siblings="contents.map((n) => n.name)"
      :on-create="(name: string) => props.onCreateFolder!(name, currentFolderId)"
      :t="t"
      @close="creating = false"
    />
    <NqFileExplorerDelete v-if="deleting && props.onDelete" :node="deleting" :on-confirm="() => confirmDelete(deleting!)" :t="t" @close="deleting = null" />
  </section>
</template>
