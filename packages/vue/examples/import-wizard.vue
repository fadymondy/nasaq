<script setup lang="ts">
import { NqImportWizard } from "@fadymondy/nasaq/vue";

const fields = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", type: "email" as const, required: true },
];
const onImport = async (rows: Record<string, string>[]) => ({ imported: rows.length });
</script>

<template>
  <NqImportWizard :fields="fields" unique-key="email" :on-import="onImport" />
</template>
