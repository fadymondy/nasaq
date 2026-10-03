<script setup lang="ts">
import { NqRichTextEditor } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

// Tiptap is not bundled. Install @tiptap/core, @tiptap/pm, @tiptap/starter-kit and @tiptap/extensions, re-export
// { Editor, Extension, StarterKit, Placeholder } from one module (./tiptap.ts) and pass
// :load="() => import('./tiptap')" so it is fetched on first mount. Until then the toolbar is disabled.
const html = ref("<p>Hello</p>");
</script>

<template>
  <NqRichTextEditor v-model="html" aria-label="Notes" class="w-[32rem]" />
</template>
