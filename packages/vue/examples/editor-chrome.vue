<script setup lang="ts">
import { computed, ref } from "vue";
import { NqEditorStatusBar, NqEditorTabs, closeEditorTab, editorCursorAt, editorTextStats } from "@fadymondy/nasaq/vue";

const tabs = ref([
  { id: "a", title: "Trip plan", dirty: true },
  { id: "b", title: "Ideas" },
]);
const active = ref<string | null>("a");
const text = ref("Book the flights");
const caret = ref(0);
const stats = computed(() => editorTextStats(text.value));
const cursor = computed(() => editorCursorAt(text.value, caret.value));

function close(id: string) {
  const next = closeEditorTab(tabs.value, active.value, id);
  tabs.value = next.tabs;
  active.value = next.activeId;
}
</script>

<template>
  <div class="flex flex-col">
    <NqEditorTabs :tabs="tabs" :active-id="active" @select="(id) => (active = id)" @close="close" />
    <textarea v-model="text" class="min-h-24 p-3" @select="caret = ($event.currentTarget as HTMLTextAreaElement).selectionStart" />
    <NqEditorStatusBar :words="stats.words" :characters="stats.characters" :line="cursor.line" :column="cursor.column" save-state="saved" />
  </div>
</template>
