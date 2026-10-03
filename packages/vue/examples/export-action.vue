<script setup lang="ts">
import { NqExportButton, type ExportColumn } from "@fadymondy/nasaq/vue";

type Row = { id: string; name: string; email: string };

const columns: ExportColumn<Row>[] = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
];
const all: Row[] = [
  { id: "1", name: "Sara Ali", email: "sara@example.com" },
  { id: "2", name: "Omar Nasser", email: "omar@example.com" },
];
</script>

<template>
  <NqExportButton :columns="columns" :scopes="{ selected: [], filtered: all, all }" filename="contacts" />
</template>
