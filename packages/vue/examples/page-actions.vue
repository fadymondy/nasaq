<script setup lang="ts">
import { Download, Plus, Trash2 } from "lucide-vue-next";
import { NqPageActions } from "@fadymondy/nasaq/vue";

const openComposer = () => {};
const exportCsv = () => {};
const confirmDelete = () => {};
</script>

<template>
  <div class="flex items-center gap-3">
    <NqPageActions
      class="ms-auto"
      :primary="{ id: 'mahaam.issue.new', label: 'New issue', icon: Plus, shortcut: 'C', onSelect: openComposer }"
      :actions="[
        { id: 'mahaam.issues.export', label: 'Export CSV', icon: Download, onSelect: exportCsv },
        { id: 'mahaam.issue.delete', label: 'Delete', icon: Trash2, danger: true, group: 'danger', onSelect: confirmDelete },
      ]"
    />
  </div>
</template>
