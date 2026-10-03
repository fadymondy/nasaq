<script setup lang="ts">
import {
  NqDataTable,
  NqDataTableFacetFilter,
  NqDataTablePagination,
  NqDataTableSearch,
  NqDataTableToolbar,
  NqDataTableViewOptions,
  NqStatus,
  useDataTable,
  type DataTableColumn,
} from "@fadymondy/nasaq/vue";
import { Pencil, Trash2 } from "lucide-vue-next";
import { h, ref } from "vue";

interface Issue {
  key: string;
  title: string;
  status: "Open" | "In progress" | "Done";
  due: string;
}
const tone = (r: Issue) => (r.status === "Done" ? "success" : r.status === "In progress" ? "info" : "neutral");
const issues = ref<Issue[]>([
  { key: "MH-728", title: "Checkout drops the coupon", status: "In progress", due: "2026-10-05" },
  { key: "MH-731", title: "Arabic invoice totals misalign", status: "Open", due: "2026-10-09" },
  { key: "MH-702", title: "Export CSV timeouts", status: "Done", due: "2026-09-28" },
]);
const columns: DataTableColumn<Issue>[] = [
  { id: "key", header: "Key", cell: (r) => r.key, sortValue: (r) => r.key, searchValue: (r) => r.key, hideable: false },
  { id: "title", header: "Title", cell: (r) => r.title, sortValue: (r) => r.title, searchValue: (r) => r.title },
  { id: "status", header: "Status", cell: (r) => h(NqStatus, { tone: tone(r) }, () => r.status), filterValue: (r) => r.status },
  { id: "due", header: "Due", cell: (r) => r.due, sortValue: (r) => r.due, align: "end" },
];
const statusOptions = ["Open", "In progress", "Done"].map((v) => ({ value: v, label: v }));
const table = useDataTable({ data: issues, columns, getRowId: (r) => r.key, pageSize: 20, selectable: true });
const edit = (r: Issue) => console.log("edit", r.key);
const remove = (r: Issue) => (issues.value = issues.value.filter((i) => i.key !== r.key));
const rowActions = (r: Issue) => [
  { id: "edit", label: "Edit", icon: Pencil, onSelect: () => edit(r) },
  { id: "delete", label: "Delete", icon: Trash2, danger: true, group: "danger", onSelect: () => remove(r) },
];
</script>

<template>
  <div class="flex flex-col gap-3">
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" placeholder="Search issues…" />
      <NqDataTableFacetFilter :table="table" column="status" :options="statusOptions" />
      <NqDataTableViewOptions :table="table" />
    </NqDataTableToolbar>
    <NqDataTable :table="table" label="Issues" :row-actions="rowActions" />
    <NqDataTablePagination :table="table" />
  </div>
</template>
