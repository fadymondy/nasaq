<script setup lang="ts">
import { Download, FileText, Trash2, Upload } from "lucide-vue-next";
import { computed, h, ref } from "vue";
import { useNasaq } from "../../provider";
import { NqDataTable, NqDataTableActions, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn } from "../data-table";
import { formatNumber, NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import type { ProjectViewStrings } from "./strings";
import type { ProjectFile, ProjectResult } from "./types";

// The files tab: upload, download and delete, in a searchable table.
const props = defineProps<{
  files: readonly ProjectFile[];
  onUpload?: (files: File[]) => Promise<ProjectResult>;
  onDownload?: (file: ProjectFile) => void;
  onDelete?: (id: string) => Promise<ProjectResult>;
  t: ProjectViewStrings;
}>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const input = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const error = ref<string | null>(null);

const fileSize = (bytes: number) => {
  if (bytes < 1024) return `${formatNumber(bytes, locale.value)} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, locale.value, { maximumFractionDigits: 0 })} KB`;
  return `${formatNumber(bytes / 1024 / 1024, locale.value, { maximumFractionDigits: 1 })} MB`;
};

const columns = computed<DataTableColumn<ProjectFile>[]>(() => [
  {
    id: "name",
    header: props.t.fileName,
    cell: (r) => h("span", { class: "inline-flex min-w-0 items-center gap-2" }, [h(FileText, { "aria-hidden": "true", class: "size-4 shrink-0 text-muted-foreground" }), h("bdi", { dir: "ltr", class: "truncate" }, r.name)]),
    sortValue: (r) => r.name,
    searchValue: (r) => r.name,
    hideable: false,
  },
  { id: "size", header: props.t.fileSize, align: "end", cell: (r) => h("bdi", { dir: "ltr" }, fileSize(r.size)), sortValue: (r) => r.size },
  { id: "by", header: props.t.fileBy, cell: (r) => r.uploadedBy ?? "—", sortValue: (r) => r.uploadedBy ?? "" },
  { id: "at", header: props.t.fileAt, cell: (r) => h(NqDateTime, { value: r.uploadedAt, format: { day: "numeric", month: "short", year: "numeric" } }), sortValue: (r) => new Date(r.uploadedAt) },
]);
const table = useDataTable<ProjectFile>({ data: () => props.files as ProjectFile[], columns: () => columns.value, getRowId: (r) => r.id, pageSize: 20 });

async function onChange(event: Event) {
  const el = event.target as HTMLInputElement;
  const chosen = [...(el.files ?? [])];
  el.value = "";
  if (!chosen.length || !props.onUpload) return;
  uploading.value = true;
  const result = await props.onUpload(chosen);
  uploading.value = false;
  error.value = result && "error" in result && result.error ? result.error : null;
}

const rowActions = (r: ProjectFile) => [
  ...(props.onDownload ? [{ id: "download", label: props.t.download, icon: Download, onSelect: () => props.onDownload?.(r) }] : []),
  ...(props.onDelete ? [{ id: "delete", label: props.t.deleteFile, icon: Trash2, danger: true, group: "danger", onSelect: () => void props.onDelete?.(r.id) }] : []),
];
const toolbarActions = computed(() => [{ id: "upload", label: props.t.upload, icon: Upload, primary: true, loading: uploading.value, onSelect: () => input.value?.click() }]);
</script>

<template>
  <div data-slot="project-files" class="flex min-w-0 flex-col gap-3">
    <input ref="input" type="file" multiple hidden @change="onChange" />
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="props.t.search" />
      <NqDataTableActions v-if="props.onUpload" class="ms-auto" :actions="toolbarActions" />
    </NqDataTableToolbar>
    <p v-if="error" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ error }}</p>
    <NqDataTable :table="table" :label="props.t.filesLabel" :row-label="(r: ProjectFile) => r.name" :row-actions="rowActions">
      <template #empty><NqEmptyState :title="props.t.noFiles" :description="props.t.noFilesHint" /></template>
    </NqDataTable>
  </div>
</template>
