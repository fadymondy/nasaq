<script setup lang="ts">
import { NqReportExportMenu, NqReportFilterBar, NqReportSheet, useReportFilters, type ReportFilterField } from "@fadymondy/nasaq/vue";

const fields: ReportFilterField[] = [
  { id: "status", kind: "multi", label: "Status", options: [{ value: "open", label: "Open" }, { value: "won", label: "Won" }] },
  { id: "owner", kind: "select", label: "Owner", options: [{ value: "sara", label: "Sara" }, { value: "omar", label: "Omar" }] },
];

const filters = useReportFilters({ fields, defaultRange: { kind: "relative", preset: "30d" }, syncLocation: false });
</script>

<template>
  <NqReportSheet title="Deals report">
    <template #toolbar>
      <NqReportExportMenu :document="{ title: 'Deals report', sections: [] }" />
    </template>
    <NqReportFilterBar :fields="fields" :state="filters.state.value" :defaults="filters.defaults.value" @update:state="filters.setState" />
    <!-- Query with filters.state.value.range and filters.state.value.fields -->
  </NqReportSheet>
</template>
