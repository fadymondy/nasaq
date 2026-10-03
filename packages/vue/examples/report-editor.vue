<script setup lang="ts">
import { NqReportEditor, type Report } from "@fadymondy/nasaq/vue";

const initial: Report = { title: "May summary", blocks: [] };
const save = async (report: Report) => {
  await fetch("/api/reports", { method: "POST", body: JSON.stringify(report) });
};
</script>

<template>
  <NqReportEditor :default-value="initial" :on-save="save" />
</template>
