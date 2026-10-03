<script setup lang="ts">
import { NqDashboardBoard, type BoardItem, type DashboardWidgetDef } from "@fadymondy/nasaq/vue";
import { h, ref } from "vue";

const widgets: DashboardWidgetDef[] = [
  { type: "revenue", title: "Revenue", description: "Revenue this month", defaultCols: 2, minCols: 1, render: (ctx) => h("p", { class: "text-h2 font-semibold" }, ctx.settings.range === "7d" ? "$12,400" : "$48,200"), fields: [{ key: "range", label: "Range", type: "select", options: [{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }] }], defaultSettings: { range: "30d" } },
  { type: "orders", title: "Orders", description: "Orders in the queue", render: () => h("p", { class: "text-h2 font-semibold" }, "318") },
  { type: "notes", title: "Notes", unique: true, render: () => h("p", { class: "text-body-sm" }, "Ship the Q4 report on Monday.") },
];
const DEFAULT: BoardItem[] = [
  { id: "revenue-1", type: "revenue", cols: 2, rows: 1 },
  { id: "orders-1", type: "orders", cols: 1, rows: 1 },
];
const layout = ref<BoardItem[]>(DEFAULT);
const save = async (next: BoardItem[]) => {
  layout.value = next;
};
</script>

<template>
  <NqDashboardBoard title="Overview" :widgets="widgets" :layout="layout" :default-layout="DEFAULT" :on-save="save" />
</template>
