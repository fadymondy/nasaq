<script setup lang="ts">
import { File as FileIcon, FileArchive, FileAudio, FileCode, FileImage, FileSpreadsheet, FileText, FileVideo, Folder } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { FileKind } from "./file-format";

// The glyph for a file kind: folders in the accent colour, everything else muted. Decorative.
const props = defineProps<{ kind: FileKind; class?: HTMLAttributes["class"] }>();
const ICONS = {
  folder: Folder,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  archive: FileArchive,
  code: FileCode,
  sheet: FileSpreadsheet,
  doc: FileText,
  text: FileText,
  other: FileIcon,
} as const;
const Glyph = computed(() => ICONS[props.kind]);
</script>

<template>
  <component :is="Glyph" aria-hidden="true" :class="cn('shrink-0', props.kind === 'folder' ? 'text-nq-accent-text' : 'text-muted-foreground', props.class)" />
</template>
